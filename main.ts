import os from 'os';
import cluster from 'cluster';
import { Duplex } from 'stream';
import FileTypeAtom from './FileTypeAtom';

interface BoxInterface {
    boxType: string,
    boxSize: bigint,
    isLargeChunk: boolean
}

export default class MediaParser extends Duplex {
    static parseBoxSize(chunk: Buffer): [bigint, boolean] {
        if (chunk.byteLength < 4) throw new Error();
        // if (chunk.byteLength < 4) throw new InsufficientDataToParseError('[Box.parseBoxSize] Chunk less than 4 bytes');
        const boxLength: number = chunk.readUInt32BE(0);
        const isLargeChunk: boolean = boxLength === 1;
        // Check large chunk
        if (isLargeChunk) {
            if (chunk.byteLength < (8+8)) throw new Error();
            // if (chunk.byteLength < (8+8)) throw new InsufficientDataToParseError('[Box.parseBoxSize] Chunk less than 16 bytes while having large chunk flag');
            const largeBoxLength = chunk.readBigUInt64BE(8);
            return [largeBoxLength, isLargeChunk];
        }
        return [BigInt(boxLength), isLargeChunk];
    }
    static parseHeader(chunk: Buffer): BoxInterface {
        let boxType, boxSize, isLargeChunk;
        boxType = chunk.toString('utf8', 4, 8);
        [boxSize, isLargeChunk] = MediaParser.parseBoxSize(chunk);
        return {boxType, boxSize, isLargeChunk};
    }
    static transformAtom(box: BoxInterface): Function {
        switch (box.boxType) {
            case "ftyp":
                return FileTypeAtom;
            default:
                break;
        }
    }
    _write(chunk: Buffer, encoding: string, callback: (error?: any) => void) {
        if (cluster.isMaster) {
            const abstractBox = (this.constructor as typeof MediaParser).parseHeader(chunk);
            const atom = (this.constructor as typeof MediaParser).transformAtom(abstractBox)(chunk);
            // Assign workers, in round robin
            if (Object.keys(cluster.workers).length >= os.cpus().length) {
                // Wait worker to complete, not calling callback
                // Returning false to pause the pipe
                // 2 remaining actions to be done:
                //      - When task done, call callback() to flush the data
                //      - When task done, emit "drain" 
                return false;
            }
            cluster.fork();
            cluster.on('exit', (worker, code, signal) => {
                console.log(`[MediaParser._write] worker ${worker.process.pid} died with code ${code}`);
            });
            return callback();
        }
    }
    
}

