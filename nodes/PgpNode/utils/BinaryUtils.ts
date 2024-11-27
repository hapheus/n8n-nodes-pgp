export class BinaryUtils {
    public static base64ToUint8Array(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);

        for (let i = 0; i < length; ++i) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes;
    }

    public static uint8ArrayToBase64(data: Uint8Array): string {
        let binaryString = '';
        const chunkSize = 8192;

        for (let i = 0; i < data.length; i += chunkSize) {
            binaryString += String.fromCharCode(...data.slice(i, i + chunkSize));
        }

        return btoa(binaryString);
    }
}
