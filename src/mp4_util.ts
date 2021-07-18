/**
 * @module: Mp4Util
 *  - Check file format validity
 *  - Convert to progressive mode (move 'moov' atom to start)
 * 
 * Example:
 *    import { Mp4Util } from './mp4_util';
 *    
 *    const mp4 = new Mp4Util('/path/input.mp4');
 *    console.log('is Complete:',    await mp4.isFileComplete());
 *    console.log('is Progressive: ',await mp4.isProgressiv());
 *    console.log('is Valid:',       await mp4.isValidMp4());
 * 
 *    await mp4.genProgressiveMp4('/path/output.mp4'); 
 *
 */
import { promises as fs } from "fs";
/**
 * Type for atom object
 */
type Atom = {
    name: string;
    size: number;
    location: number;
};
/**
 * The MoveMoovAtom class: move 'moov' atom to start of file
 * @in_file: input file
 * @out_file: output file
 * 
 * moveMoovToStart : move 'moov' to start of output file
 * Usag Example:
 *      const mp4Util = new MoveMoovAtom(in_file, out_file);
 *      mp4Util.moveMoovToStart();
 * 
 */
class Mp4Util {
    private in_file: string;
    private out_file: string;
    private atoms: Atom[];


    constructor(in_file: string) {
        this.in_file = in_file;
        this.out_file = "";
        this.atoms = [];
    }
    /**
     * Check if file has main atoms on it. 'ftyp', 'moov', 'mdat'
     * @returns True if ok, else False
     */
    public async isValidMp4(): Promise<boolean> {
        await this.readTopAtoms();
        return this.hasMainAtoms();
    }
    /**
     * Check if 'moov' atom is immidtatly after 'ftyp'
     * @returns True if ok, else False
     */
    public async isProgressiv(): Promise<boolean> {
        await this.readTopAtoms();
        return this.isMoovAtStart();
    }
    public async isFileComplete(): Promise<boolean> {
        try {
            await this.readTopAtoms();
            let size = 0;
            this.atoms.forEach((atom) => { size += atom.size; });
            const file_size = (await fs.stat(this.in_file)).size;
            console.log(`atoms size:${size}, file size:${file_size}`);
            return size == file_size;
        } catch (err) {
            console.error(err);
        }
        return false;
    }
    /**
     * Generate output file and move 'moov' to start of it
     * @returns True if successfull, else False
     */
    public async genProgressiveMp4(out_file: string): Promise<boolean> {
        try {
            this.out_file = out_file;
            await this.readTopAtoms();
            if (!this.hasMainAtoms()) {
                console.warn("Envalid mp4. exit!");
                return false;
            }
            if (this.isMoovAtStart()) {
                console.warn("Moov is at start of file, do nothing.");
                return false;
            }

            console.log("Start to move moov...");
            const in_f = await fs.open(this.in_file, 'r');
            const out_f = await fs.open(this.out_file, 'w');

            // Copy ftyp
            console.log("Copy ftyp");
            const ftyp_size = this.atoms[0].size;
            let ftyp_buf = new DataView(new ArrayBuffer(ftyp_size));
            await in_f.read(ftyp_buf, 0, ftyp_size, 0);
            await out_f.write(new Uint8Array(ftyp_buf.buffer), 0, ftyp_size);

            // Read and change chunk index in moov
            console.log("Copy moov");
            const moov = this.getMoovAtom();
            let moov_buf = new DataView(new ArrayBuffer(moov.size));
            await in_f.read(moov_buf, 0, moov.size, moov.location);
            await this.changeChunkIndex(moov_buf);
            await out_f.write(new Uint8Array(moov_buf.buffer), 0, moov.size);

            // Write other atoms to output
            for (const atom of this.atoms) {
                if (atom.name != 'ftyp' && atom.name != 'moov') {
                    console.log("Copy", atom.name);
                    await this.copyFile(in_f, atom.location, atom.size, out_f);
                }
            }

            await in_f.close();
            await out_f.close();
        } catch (err) {
            console.log(err);
        }
        return true;
    }
    public toString(): string {
        let atoms: string = '';
        for (const atom of this.atoms) {
            atoms = '\n' + atom.toString();
        }
        return atoms;
    }

    /**
     * List of Atoms in input file
     * @returns Array of {name, size} object for atoms
     */
    private async readTopAtoms() {
        try {
            if (this.atoms.length != 0) return;
            const fd = await fs.open(this.in_file, "r")
            let bufview = new DataView(new ArrayBuffer(4));
            let n: number = 0;
            let size: number = 0;
            let position: number = 0;
            while (true) {
                const res0 = await fd.read(bufview, 0, 4, position);
                if (res0.bytesRead != 4) break;
                size = bufview.getUint32(0);
                const res1 = await fd.read(bufview, 0, 4, position + 4);
                if (res1.bytesRead != 4) break;
                const type = new Uint8ClampedArray(bufview.buffer);
                const type_name = new TextDecoder().decode(type);
                this.atoms.push({
                    name: type_name,
                    size: size,
                    location: position
                });
                position += size;
            }
            console.log(`Atom number: ${this.atoms.length}`);
        } catch (err) {
            console.log(err);
        }
    }
    /**
     * 
     * @returns moov atom from this.atoms list
     */
    private getMoovAtom(): Atom {
        for (const atom of this.atoms) {
            if (atom.name == 'moov') return atom;
        }
        return { name: '', size: 0, location: 0 };
    }
    /**
     * Chack validation of file:
     *  
     * @returns True if input file is valid mp4 format
     */
    private hasMainAtoms(): boolean {
        if (this.atoms.length < 3) {
            console.error("Input file has less than three atom.");
            return false;
        }
        if (this.atoms[0].name != 'ftyp') {
            console.error("First atom is not 'ftyp'.");
            return false;
        }
        let hasMdat: boolean = false;
        let hasMoov: boolean = false;
        for (const atom of this.atoms) {
            if (atom.name == 'moov') hasMoov = true;
            if (atom.name == 'mdat') hasMdat = true;
        }
        if (!hasMdat || !hasMoov) {
            console.error("Input file has not mdat or moov.");
            return false;
        }
        return true;
    }
    private isMoovAtStart(): boolean {
        for (let i = 0; i < this.atoms.length; i++) {
            const element = this.atoms[i];
            if (element.name == 'moov' && i == 1) return true;
        }
        return false;
    }/**
     * Copy input file to output file
     * @param in_f : input file
     * @param position : position on input file
     * @param size : size to copy
     * @param out_f : output file
     */
    private async copyFile(in_f: fs.FileHandle, position: number,
        size: number, out_f: fs.FileHandle) {
        try {
            let buf = new DataView(new ArrayBuffer(4096));
            while (size > 0) {
                let len = (size > 4096) ? 4096 : size;
                let res = await in_f.read(buf, 0, len, position);
                if (res.bytesRead <= 0) break;
                await out_f.write(new Uint8Array(buf.buffer), 0, res.bytesRead);
                size -= res.bytesRead;
                position += res.bytesRead;
            }
        } catch (err) {
            console.log(err);
        }
    }
    private readAtom(data: DataView, pos: number = 0): Atom {
        let size = data.getInt32(pos);
        const _name = new Uint8Array(data.buffer.slice(pos + 4, pos + 8));
        const name = new TextDecoder().decode(_name);
        //console.log(`read atom ${name}`);
        return {
            name: name,
            size: size,
            location: pos
        };
    }
    /**
     * Add moov size for all index in STCO or CO64, because we move
     * moov atom before mdat atom
     * @param moov_data : moov atom data
     * @param atom : index atom (stco or co64)
     */
    private async changeSTCO(moov_data: DataView, atom: Atom) {
        const moov = this.getMoovAtom();
        const stco_pos = atom.location;
        let offset_count = moov_data.getUint32(stco_pos + 12);
        console.log(`Try to change indexes for ${atom}, Offset count: ${offset_count}`);
        const cell_size = (atom.name == 'co64') ? 8 : 4;
        for (let i = 0; i < offset_count; i++) {
            let pos = stco_pos + 16 + (i * cell_size);
            let old_offset = moov_data.getUint32(pos);
            let new_offset = old_offset + moov.size;
            moov_data.setUint32(pos, new_offset);
            //console.log(`pos:${pos}, cur_offset: ${old_offset}, new_offset:${new_offset} `);
        }
    }
    /**
     * Look up to STCO and CO64 atom and change index on them.
     * @param moov_data : Moov atom of input file
     */
    private async changeChunkIndex(moov_data: DataView) {
        let moov_size: number = moov_data.byteLength;
        const atom_container: string[] = ['trak', 'mdia', 'minf', 'stbl'];
        let pos = 8;
        while (pos < moov_size - 8) {
            let atom = this.readAtom(moov_data, pos);
            if (atom.name == 'stco' || atom.name == 'co64') {
                await this.changeSTCO(moov_data, atom);
            }
            if (atom_container.indexOf(atom.name) != -1) {
                pos += 8;
            } else {
                pos += atom.size;
            }
        }
    }
}

export { Mp4Util };