import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataCompressor } from '../nodes/PgpNode/utils/DataCompressor';

const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));

describe('DataCompressor', () => {
    const algorithms = ['zlib', 'zip'];

    algorithms.forEach((algorithm) => {
        test(`compresses and decompresses with ${algorithm}`, () => {
            const compressedData = DataCompressor.compress(binaryData, algorithm);
            expect(compressedData).toBeTruthy();

            const decompressedData = DataCompressor.uncompress(compressedData, algorithm);
            expect(decompressedData).toBeTruthy();
            expect(Array.from(decompressedData)).toEqual(Array.from(binaryData));
        });
    });

    test('throws an error for unsupported algorithm during compression', () => {
        expect(() => {
            DataCompressor.compress(binaryData, 'unsupportedAlgorithm');
        }).toThrowError(new Error('Unsupported algorithm'));
    });

    test('throws an error for unsupported algorithm during decompression', () => {
        const compressedData = DataCompressor.compress(binaryData);
        expect(() => {
            DataCompressor.uncompress(compressedData, 'unsupportedAlgorithm');
        }).toThrowError(new Error('Unsupported algorithm'));
    });
});
