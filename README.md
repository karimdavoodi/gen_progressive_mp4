# gen_progressive_mp4
Convert mp4 to progressive mode
   - Check file format validity
   - Convert to progressive mode (move 'moov' atom to start)
  
## Example:

     import { Mp4Util } from './mp4_util';
     
     const mp4 = new Mp4Util('/path/input.mp4');
     console.log('is Complete:',    await mp4.isFileComplete());
     console.log('is Progressive: ',await mp4.isProgressiv());
     console.log('is Valid:',       await mp4.isValidMp4());
  
     await mp4.genProgressiveMp4('/path/output.mp4'); 
