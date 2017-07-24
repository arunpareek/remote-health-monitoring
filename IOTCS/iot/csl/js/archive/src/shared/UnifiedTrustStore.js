/**
 * Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.
 *
 * This software is dual-licensed to you under the MIT License (MIT) and
 * the Universal Permissive License (UPL). See the LICENSE file in the root
 * directory for license terms. You may choose either license, or both.
 *
 */

/**
 * This class provides an implementation of the trusted assets format
 * as values of the tag-length-value form in a Base64 encoded AES encrypted
 * file.
 * <p>
 * Unified client provisioning format:
 * <p>
 * format = version & blob & *comment<br>
 * version = 1 byte, value 33<br>
 * blob = MIME base64 of encrypted & new line<br>
 * encrypted = IV & AES-128/CBC/PKCS5Padding of values<br>
 * IV = 16 random bytes<br>
 * values = *TLV<br>
 * TLV = tag & length & value<br>
 * tag = byte<br>
 * length = 2 byte BE unsigned int<br>
 * value = length bytes<br>
 * comment = # & string & : & string & new line<br>
 * string = UTF-8 chars<br>
 * <p>
 * The password based encryption key is the password processed by 10000
 * interations of PBKDF2WithHmacSHA1 with the IV as the salt.
 * <p>
 * This class is internally used by the trusted assets store managers
 * to read/write files in the unified format
 *
 * @class
 * @memberOf iotcs
 * @alias UnifiedTrustStore
 *
 */
lib.UnifiedTrustStore = function (taStoreFileExt, taStorePasswordExt, forProvisioning) {

    this.trustStoreValues = {
        clientId: null,
        sharedSecret: null,
        serverHost: null,
        serverPort: null,
        endpointId: null,
        serverScheme: null,
        privateKey: null,
        publicKey: null,
        trustAnchors: null,
        certificate: null
    };

    var taStoreFile = taStoreFileExt || lib.oracle.iot.tam.store;
    var taStorePassword = taStorePasswordExt || lib.oracle.iot.tam.storePassword;

    if (!taStoreFile) {
        lib.error('No TA Store file defined');
        return;
    }
    if (!taStorePassword) {
        lib.error('No TA Store password defined');
        return;
    }

    var self = this;

    this.load = function () {
        var input = $port.file.load(taStoreFile);
        if (input.charCodeAt(0) != lib.UnifiedTrustStore.constants.version) {
            lib.error('Invalid unified trust store version');
            return;
        }
        var base64BlockStr = input.substring(1, input.indexOf('#'));
        var encryptedData = forge.util.decode64(base64BlockStr);
        var iv = forge.util.createBuffer();
        var encrypted = forge.util.createBuffer();
        for (var i = 0; i < lib.UnifiedTrustStore.constants.AES_BLOCK_SIZE; i++) {
            iv.putInt(encryptedData.charCodeAt(i), 8);
        }
        iv = iv.getBytes();
        for (i = lib.UnifiedTrustStore.constants.AES_BLOCK_SIZE; i < encryptedData.length; i++) {
            encrypted.putInt(encryptedData.charCodeAt(i), 8);
        }
        var key = forge.pkcs5.pbkdf2(taStorePassword, iv, lib.UnifiedTrustStore.constants.PBKDF2_ITERATIONS, lib.UnifiedTrustStore.constants.AES_KEY_SIZE);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({iv: iv});
        decipher.update(encrypted);
        decipher.finish();
        var output = decipher.output;
        while (!output.isEmpty()) {
            var tag = output.getInt(8);
            var length = (output.getInt(16) >> 0);
            var buf = output.getBytes(length);
            switch (tag) {
                case lib.UnifiedTrustStore.constants.TAGS.serverUri:
                    var urlObj = forge.util.parseUrl(buf);
                    self.trustStoreValues.serverHost = urlObj.host;
                    self.trustStoreValues.serverPort = urlObj.port;
                    self.trustStoreValues.serverScheme = urlObj.scheme;
                    break;

                case lib.UnifiedTrustStore.constants.TAGS.clientId:
                    self.trustStoreValues.clientId = buf;
                    break;

                case lib.UnifiedTrustStore.constants.TAGS.sharedSecret:
                    self.trustStoreValues.sharedSecret = buf;
                    break;

                case lib.UnifiedTrustStore.constants.TAGS.endpointId:
                    self.trustStoreValues.endpointId = buf;
                    break;

                case lib.UnifiedTrustStore.constants.TAGS.trustAnchor:
                    if (!self.trustStoreValues.trustAnchors) {
                        self.trustStoreValues.trustAnchors = [];
                    }
                    self.trustStoreValues.trustAnchors.push(forge.pki.certificateToPem(forge.pki.certificateFromAsn1(forge.asn1.fromDer(buf))));
                    break;

                case lib.UnifiedTrustStore.constants.TAGS.privateKey:
                    self.trustStoreValues.privateKey = forge.pki.privateKeyFromAsn1(forge.asn1.fromDer(buf));
                    break;

                case lib.UnifiedTrustStore.constants.TAGS.publicKey:
                    self.trustStoreValues.publicKey = forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(buf));
                    break;
            }
        }
    };

    this.store = function (values) {
        if (values) {
            Object.keys(values).forEach(function (key) {
                self.trustStoreValues[key] = values[key];
            });
        }
        var buffer = forge.util.createBuffer();
        var serverUri = self.trustStoreValues.serverScheme + '://' + self.trustStoreValues.serverHost + ':' + self.trustStoreValues.serverPort;
        buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.serverUri, 8);
        buffer.putInt(serverUri.length, 16);
        buffer.putBytes(serverUri);
        buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.clientId, 8);
        buffer.putInt(self.trustStoreValues.clientId.length, 16);
        buffer.putBytes(self.trustStoreValues.clientId);
        buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.sharedSecret, 8);
        buffer.putInt(self.trustStoreValues.sharedSecret.length, 16);
        buffer.putBytes(self.trustStoreValues.sharedSecret);
        if (self.trustStoreValues.endpointId) {
            buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.endpointId, 8);
            buffer.putInt(self.trustStoreValues.endpointId.length, 16);
            buffer.putBytes(self.trustStoreValues.endpointId);
        }
        if (Array.isArray(self.trustStoreValues.trustAnchors)) {
            self.trustStoreValues.trustAnchors.forEach(function (trustAnchor) {
                var trust = forge.asn1.toDer(forge.pki.certificateToAsn1(forge.pki.certificateFromPem(trustAnchor))).getBytes();
                buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.trustAnchor, 8);
                buffer.putInt(trust.length, 16);
                buffer.putBytes(trust);
            });
        }
        if (self.trustStoreValues.privateKey) {
            buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.privateKey, 8);
            var tempBytes = forge.asn1.toDer(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(self.trustStoreValues.privateKey))).getBytes();
            buffer.putInt(tempBytes.length, 16);
            buffer.putBytes(tempBytes);
        }
        if (self.trustStoreValues.publicKey) {
            buffer.putInt(lib.UnifiedTrustStore.constants.TAGS.publicKey, 8);
            var tempBytes1 = forge.asn1.toDer(forge.pki.publicKeyToAsn1(self.trustStoreValues.publicKey)).getBytes();
            buffer.putInt(tempBytes1.length, 16);
            buffer.putBytes(tempBytes1);
        }
        var iv = forge.random.getBytesSync(lib.UnifiedTrustStore.constants.AES_BLOCK_SIZE);
        var key = forge.pkcs5.pbkdf2(taStorePassword, iv, lib.UnifiedTrustStore.constants.PBKDF2_ITERATIONS, lib.UnifiedTrustStore.constants.AES_KEY_SIZE);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({iv: iv});
        cipher.update(buffer);
        cipher.finish();
        var finalBuffer = forge.util.createBuffer();
        finalBuffer.putInt(lib.UnifiedTrustStore.constants.version, 8);
        finalBuffer.putBytes(forge.util.encode64(iv+cipher.output.getBytes()));
        finalBuffer.putBytes('#');
        $port.file.store(taStoreFile, finalBuffer.getBytes());
    };

    this.setValues = function (otherManager) {
        Object.keys(otherManager).forEach(function (key) {
            if (self.trustStoreValues[key]) {
                otherManager[key] = self.trustStoreValues[key];
            }
        });
    };

    this.update = function (otherManager) {
        Object.keys(otherManager).forEach(function (key) {
            if (otherManager[key] && (typeof self.trustStoreValues[key] !== 'undefined')) {
                self.trustStoreValues[key] = otherManager[key];
            }
        });
        self.store();
    };

    if (!forProvisioning) {
        this.load();
    }

};

/**
 * Enumeration of unified trust store format constants
 *
 * @memberOf iotcs.UnifiedTrustStore
 * @alias constants
 * @class
 * @readonly
 * @enum {Integer}
 */
lib.UnifiedTrustStore.constants = {
    version: 33,
    AES_BLOCK_SIZE: 16,
    AES_KEY_SIZE: 16,
    PBKDF2_ITERATIONS: 10000
};

lib.UnifiedTrustStore.constants.TAGS = {
    serverUri: 1,
    clientId: 2,
    sharedSecret: 3,
    endpointId: 4,
    trustAnchor: 5,
    privateKey: 6,
    publicKey: 7
};


/**
 * This is a helper method for provisioning files used by
 * the trusted assets store managers in the unified trust
 * store format.
 *
 * @param {string} taStoreFile - the Trusted Assets Store file name.
 * @param {string} taStorePassword - the Trusted Assets Store password.
 * @param {string} serverHost - the IoT CS server host name.
 * @param {number} serverPort - the IoT CS server port.
 * @param {string} clientId - activation ID for devices or client ID for application integrations.
 * @param {string} sharedSecret - the client's shared secret.
 * @param {string} truststore - the truststore file containing PEM-encoded trust anchors certificates to be used to validate the IoT CS server
 * certificate chain.
 * @param {string} serverScheme - the scheme used to communicate with the server. Possible values are http(s) or mqtt(s).
 *
 * @memberOf iotcs.UnifiedTrustStore
 * @function provision
 */
lib.UnifiedTrustStore.provision = function (taStoreFile, taStorePassword, serverHost, serverPort, clientId, sharedSecret, truststore, serverScheme) {
    if (!taStoreFile) {
        throw 'No TA Store file provided';
    }
    if (!taStorePassword) {
        throw 'No TA Store password provided';
    }
    var entries = {
        clientId: clientId,
        serverHost: serverHost,
        serverPort: serverPort,
        serverScheme: (serverScheme ? serverScheme : 'http'),
        sharedSecret: sharedSecret,
        trustAnchors: (truststore ? (Array.isArray(truststore) ? truststore : _loadTrustAnchorsBinary(truststore)) : [])
    };
    new lib.UnifiedTrustStore(taStoreFile, taStorePassword, true).store(entries);
};

/** @ignore */
function _loadTrustAnchorsBinary (truststore) {
    return $port.file.load(truststore)
        .split(/\-{5}(?:B|E)(?:[A-Z]*) CERTIFICATE\-{5}/)
        .filter(function(elem) { return ((elem.length > 1) && (elem.indexOf('M') > -1)); })
        .map(function(elem) { return '-----BEGIN CERTIFICATE-----' + elem.replace(new RegExp('\r\n', 'g'),'\n') + '-----END CERTIFICATE-----'; });
}
