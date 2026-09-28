export const secureEncrypt = (TextValue) => {
    const ret = enc(TextValue);
    return ret;
}

const salt = 1234;
const enc = (textToEncrypt) => {
    const m = parseInt(textToEncrypt) * salt;
    
    return EncodeTo64(XOR(m.toString()));
}

const XOR = (val) => {
    const key = "ASIodhp893dp()?SH´dsjpäa";
    let result = "";

    for (let c = 0; c < val.length; c++) {
        const character = val[c];
        const charCode = character.charCodeAt(0); // Get the char code of the character
        const keyPosition = c % key.length; // Use modulo to wrap around the key
        const keyChar = key[keyPosition];
        const keyCode = keyChar.charCodeAt(0); // Get the char code of the key character
        const combinedCode = charCode ^ keyCode; // Perform the XOR operation
        const combinedChar = String.fromCharCode(combinedCode); // Convert the result back to a character
        result += combinedChar; // Append the combined character to the result
    }    
    return result;
}

const getASCIIBytes = (str) => {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xFF); // Ensure it's within the ASCII byte range (0-255)
    }
    return bytes;
}

const EncodeTo64 = (toEncode) => {
    const bytes = getASCIIBytes(toEncode);
    return UrlTokenEncode(bytes);
}

const UrlTokenEncode = (input) => {
    if (input == null) {
        throw new Error("input cannot be null");
    }

    if (input.length < 1) {
        return '';
    }

    ////////////////////////////////////////////////////////
    // Step 1: Do a Base64 encoding

    const byteArray = new Uint8Array(input);
    const base64Str = btoa(String.fromCharCode(...byteArray)); // Convert to Base64

    ////////////////////////////////////////////////////////
    // Step 2: Remove padding ('=' characters) from the Base64 string
    let endPos = base64Str.length;
    while (endPos > 0 && base64Str[endPos - 1] === '=') {
        endPos--; // Move backwards until we find a non-padding character.
    }   
    
    ////////////////////////////////////////////////////////
    // Step 3: Create char array to store all non-padding chars,
    //      plus a char to indicate how many padding chars are needed
    let base64Chars = new Array(endPos + 1);
    base64Chars[endPos] = String.fromCharCode(48 + (base64Str.length - endPos)); // Store a char at the end, to indicate how many padding chars are needed
    
    ////////////////////////////////////////////////////////
    // Step 4: Copy in the other chars. Transform the "+" to "-", and "/" to "_"
    for (let i = 0; i < endPos; i++) {
        let c = base64Str[i];
        switch (c) {
            case '+':
                base64Chars[i] = '-';
                break;
            case '/':
                base64Chars[i] = '_';
                break;
            case '=':
                // This should never happen as we already removed padding
                throw new Error("Unexpected '=' character found");
            default:
                base64Chars[i] = c;
                break;
        }
    }    
    return base64Chars.join('');
}
