import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SignApkWithApksig {
    private static KeyStore loadKeyStore(String path, char[] password) throws Exception {
        Exception last = null;
        for (String type : new String[] {"JKS", "PKCS12", KeyStore.getDefaultType()}) {
            try (FileInputStream in = new FileInputStream(path)) {
                KeyStore ks = KeyStore.getInstance(type);
                ks.load(in, password);
                return ks;
            } catch (Exception e) {
                last = e;
            }
        }
        throw last;
    }

    public static void main(String[] args) throws Exception {
        File inputApk = new File(args[0]);
        File outputApk = new File(args[1]);
        String keystorePath = args[2];
        char[] password = args[3].toCharArray();
        String alias = args[4];

        KeyStore ks = loadKeyStore(keystorePath, password);
        PrivateKey privateKey = (PrivateKey) ks.getKey(alias, password);
        Certificate[] chain = ks.getCertificateChain(alias);
        if (chain == null || chain.length == 0) {
            chain = new Certificate[] {ks.getCertificate(alias)};
        }

        List<X509Certificate> certs = new ArrayList<>();
        for (Certificate cert : chain) {
            certs.add((X509Certificate) cert);
        }

        ApkSigner.SignerConfig signerConfig =
                new ApkSigner.SignerConfig.Builder("androiddebugkey", privateKey, certs).build();
        ApkSigner signer = new ApkSigner.Builder(Collections.singletonList(signerConfig))
                .setInputApk(inputApk)
                .setOutputApk(outputApk)
                .setMinSdkVersion(23)
                .setV1SigningEnabled(false)
                .setV2SigningEnabled(true)
                .setV3SigningEnabled(true)
                .build();
        signer.sign();

        ApkVerifier.Result result = new ApkVerifier.Builder(outputApk).build().verify();
        System.out.println("verified=" + result.isVerified()
                + " v1=" + result.isVerifiedUsingV1Scheme()
                + " v2=" + result.isVerifiedUsingV2Scheme()
                + " v3=" + result.isVerifiedUsingV3Scheme());
        if (!result.isVerified()) {
            throw new IllegalStateException("APK verification failed");
        }
    }
}
