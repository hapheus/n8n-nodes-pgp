import * as fs from 'node:fs';
import * as path from 'node:path';
import { BinaryUtils } from '../nodes/PgpNode/utils/BinaryUtils';

test('convert text data to base64 string', async () => {
    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-text.txt'));
    const binaryDataBase64 = binaryData.toString('base64');

    expect(typeof binaryData).toEqual('object');
    expect(binaryData instanceof Uint8Array).toBeTruthy();
    expect(typeof binaryDataBase64).toEqual('string');

    const encodedDataBase64 = BinaryUtils.uint8ArrayToBase64(binaryData);
    expect(typeof encodedDataBase64).toEqual('string');
    expect(encodedDataBase64).toEqual(binaryDataBase64);
});

test('convert base64 string back to text data', async () => {
    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-text.txt'));
    const binaryDataBased64 = binaryData.toString('base64');

    expect(typeof binaryData).toEqual('object');
    expect(binaryData instanceof Uint8Array).toBeTruthy();
    expect(typeof binaryDataBased64).toEqual('string');

    const encodedData = BinaryUtils.base64ToUint8Array(binaryDataBased64);

    expect(typeof encodedData).toEqual('object');
    expect(encodedData instanceof Uint8Array).toBeTruthy();
    expect(Array.from(encodedData)).toEqual(Array.from(binaryData));
});

test('convert binary data to base64 string', async () => {
    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));
    const binaryDataBase64 = binaryData.toString('base64');

    expect(typeof binaryData).toEqual('object');
    expect(binaryData instanceof Uint8Array).toBeTruthy();
    expect(typeof binaryDataBase64).toEqual('string');

    const encodedDataBase64 = BinaryUtils.uint8ArrayToBase64(binaryData);
    expect(typeof encodedDataBase64).toEqual('string');
    expect(encodedDataBase64).toEqual(binaryDataBase64);
});

test('convert base64 string back to binary data', async () => {
    const binaryData = fs.readFileSync(path.resolve(__dirname, './files/test-image.png'));
    const binaryDataBased64 = binaryData.toString('base64');

    expect(typeof binaryData).toEqual('object');
    expect(binaryData instanceof Uint8Array).toBeTruthy();
    expect(typeof binaryDataBased64).toEqual('string');

    const encodedData = BinaryUtils.base64ToUint8Array(binaryDataBased64);

    expect(typeof encodedData).toEqual('object');
    expect(encodedData instanceof Uint8Array).toBeTruthy();
    expect(Array.from(encodedData)).toEqual(Array.from(binaryData));
});
