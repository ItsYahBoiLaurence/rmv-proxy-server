import { Request, Response } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import dotenv from "dotenv";
import { SftpService } from "./sftp.service";
import fs from "fs";

dotenv.config();

const app = express();

const upload = multer({
  dest: "uploads/",
});

app.use(express.json());

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

app.get("/", async (req, res) => {
  const sftp = new SftpService();

  try {
    await sftp.connect();
    res.send({ message: "Connection Stablished!" });
  } catch (e) {
    console.log(e);
  } finally {
    await sftp.disconnect();
  }
});

app.post(
  "/upload",
  upload.single("file"),
  async (req: MulterRequest, res: Response) => {
    const sftp = new SftpService();
    let tempFilePath = null;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      await sftp.connect();

      const localFilePath = req.file.path;
      const originalFileName = req.file.originalname;
      const remoteFilePath = path.posix.join("/incoming", originalFileName);

      await sftp.upload(localFilePath, remoteFilePath);

      res.json({
        success: true,
        message: "File uploaded to SFTP server successfully",
        filename: originalFileName,
        remotePath: remoteFilePath,
      });
    } catch (e) {
      console.error("SFTP upload error:", e);
      res.status(500).json({
        success: false,
        error: "Failed to upload file to SFTP server",
      });
    } finally {
      if (sftp) {
        await sftp.disconnect();
      }
      if (tempFilePath) {
        try {
          fs.unlink(tempFilePath, () => {});
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }
    }
  }
);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
