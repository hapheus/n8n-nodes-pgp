import * as zlib from 'zlib';
import { deflateSync, inflateSync } from 'fflate';

export class DataCompressor {
    static compress(data: Uint8Array, algorithm: string = 'zip'): Uint8Array {
        switch (algorithm) {
            case 'zlib':
                return zlib.gzipSync(data);
            case 'zip':
                return deflateSync(data);
            default:
                throw new Error('Unsupported algorithm');
        }
    }

    static uncompress(data: Uint8Array, algorithm: string = 'zip'): Uint8Array {
        switch (algorithm) {
            case 'zlib':
                return zlib.gunzipSync(data);
            case 'zip':
                return inflateSync(data);
            default:
                throw new Error('Unsupported algorithm');
        }
    }
}
