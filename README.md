# n8n-nodes-pgp

This is an n8n community node. It lets you use OpenPGP encryption and signing in your n8n workflows.

[OpenPGP](https://www.openpgp.org/) is a standard for encryption and signing of data.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Table of Contents
* [Installation](#installation)
* [Operations](#operations)
* [Credentials](#credentials)
* [Resources](#resources)
* [Screenshots](#screenshots)


## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- Encrypt: Encrypts text using OpenPGP encryption.
- Decrypt: Decrypts text using OpenPGP decryption.
- Sign: Signs text using OpenPGP signing.
- Verify: Verifies the signature of text using OpenPGP.

## Credentials

To authenticate with this node, you need to provide the following credentials:
- Passphrase: The passphrase for the private key.
- Public Key: Armored public key for encryption and verification.
- Private Key: Armored private key for decryption and signing.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [openpgpjs](https://openpgpjs.org/)

## Screenshots

### Credentials
![Credentials](./docs/images/credentials.png)

### Encryption
![Encrypt](./docs/images/encrypt.png)

### Decryption
![Decrypt](./docs/images/decrypt.png)

### Signing
![Sign](./docs/images/sign.png)

### Verification
![Verify](./docs/images/verify.png)

## Test Results

This section displays the results of unit tests for each operation, based on a live n8n instance.

| Operation            | Last Tested                                               | Status                                                     |
|----------------------|-----------------------------------------------------------|------------------------------------------------------------|
| Encrypt              | <span id="test-encrypt-date">2024-11-27</span>            | <span id="test-encrypt-result">✅ Success</span>            |
| Decrypt              | <span id="test-decrypt-date">2024-11-27</span>            | <span id="test-decrypt-result">✅ Success</span>             |
| Sign                 | <span id="test-sign-date">2024-11-27</span>               | <span id="test-sign-result">✅ Success</span>                |
| Verify               | <span id="test-verify-date">2024-11-27</span>             | <span id="test-verify-result">✅ Success</span>              |

### Unit Tests

Unit tests can be executed with the following command:

```bash
npx jest
```

#### Test Results

**binary-utils.test.ts**

* Convert text data to base64 string
* Convert base64 string back to text data
* Convert binary data to base64 string
* Convert base64 string back to binary data

**sign.test.ts**

* Signs and verifies text message
* Signs and verifies text message with encrypted private key
* Verify fails with a different keypair
* Signs binary data
* Verify fails with a different keypair

**data-compressor.ts**

* Compresses and decompresses with zlib
* Compresses and decompresses with zip
* Throws an error for unsupported algorithm during compression
* Throws an error for unsupported algorithm during decompression

**encrypt.test.ts**

* Encrypts and decrypts a text message
* Encrypts and decrypts a text message with encrypted private key
* Decryption fails with a different private key
* Encrypts and decrypts a binary file
* Binary decryption fails with a dirrent private key
* Encryps and decrypts a compresses binary file

#### Code Coverage:
* Statements: 100%
* Branches: 100%
* Functions: 100%
* Lines: 100%
