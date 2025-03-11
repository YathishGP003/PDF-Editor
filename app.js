const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFExtract } = require("pdf.js-extract");
const PDFDocument = require("pdfkit");

const app = express();
const port = process.env.PORT || 3000;
const pdfExtract = new PDFExtract();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  "/tinymce",
  express.static(path.join(__dirname, "node_modules", "tinymce"))
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.post("/upload", upload.single("pdfFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const filePath = req.file.path;
    const options = {};

    // Extract PDF content
    const data = await pdfExtract.extract(filePath, options);

    // Process the PDF data to create HTML content
    let htmlContent = "";
    data.pages.forEach((page, pageIndex) => {
      htmlContent += `<div class="pdf-page" data-page="${pageIndex + 1}">`;

      // Add text content
      page.content.forEach((item) => {
        const style = `position: absolute; left: ${item.x}px; top: ${item.y}px; font-size: ${item.fontSize}px;`;
        htmlContent += `<div style="${style}">${item.str}</div>`;
      });

      htmlContent += "</div>";
    });

    // Store the file information in session or pass to the editor
    res.render("editor", {
      pdfContent: htmlContent,
      originalFile: req.file.filename,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).send("Error processing PDF file");
  }
});

app.post("/export", async (req, res) => {
  try {
    const { content } = req.body;

    // Create a new PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=edited-document.pdf"
    );

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add the content to the PDF
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(content.replace(/<[^>]*>/g, ""), {
        align: "left",
        lineGap: 5,
      });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error("Error exporting PDF:", error);
    res.status(500).send("Error exporting to PDF");
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
