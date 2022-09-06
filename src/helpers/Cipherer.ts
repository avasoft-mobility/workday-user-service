import crypto from "crypto";

class Cipherer {
  static algorithm = "aes-256-ctr";
  static secretKey = process.env.CIPHER_SECRET!.toString();
  static iv = process.env.CIPHER_IV!.toString();

  static encrypt = (text: string) => {
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(this.iv, "hex")
    );

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return encrypted.toString("hex");
  };

  static decrypt = (hash: string) => {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(this.iv, "hex")
    );

    const decrpyted = Buffer.concat([
      decipher.update(Buffer.from(hash, "hex")),
      decipher.final(),
    ]);

    return decrpyted.toString();
  };
}

export default Cipherer;
