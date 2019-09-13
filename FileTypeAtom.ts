interface FileTypeAtomInterface {
    majorBrand?: string,
    minorVersion?: number,
    compatibleBrands?: string[]
}

export default function FileTypeAtom(chunk: Buffer, atom: FileTypeAtomInterface = {}): FileTypeAtomInterface {
    if (!atom.majorBrand) {
        // @TODO
        atom.majorBrand = chunk.toString('utf8', 0, 4);
        chunk = chunk.subarray(4);
    }
    if (!atom.minorVersion) {
        // @TODO
        atom.minorVersion = chunk.readUInt32BE(0);
        chunk = chunk.subarray(4);
    }
    atom.compatibleBrands = atom.compatibleBrands || [];
    while(chunk.length >= 4) {
        atom.compatibleBrands.push(chunk.toString('utf8', 0, 4));
        chunk = chunk.subarray(4);
    }
    return atom;
}