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
    const options = {
      // Add options to extract more PDF information
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    // Extract PDF content with formatting
    const data = await pdfExtract.extract(filePath, options);

    // Process the PDF data to create HTML content with preserved formatting
    let htmlContent = "";
    data.pages.forEach((page, pageIndex) => {
      htmlContent += `<div class="pdf-page" data-page="${
        pageIndex + 1
      }" style="width: ${page.width}px; height: ${page.height}px;">`;

      // Add text content with precise positioning and styling
      page.content.forEach((item) => {
        const style = `
          position: absolute;
          left: ${item.x}px;
          top: ${item.y}px;
          font-family: ${item.fontName || "Arial"};
          font-size: ${item.fontSize}px;
          transform: scale(${item.scaleX || 1}, ${item.scaleY || 1});
          color: rgb(${item.color?.r || 0}, ${item.color?.g || 0}, ${
          item.color?.b || 0
        });
          letter-spacing: ${item.letterSpacing || "normal"};
          line-height: ${item.lineHeight || "normal"};
        `;
        htmlContent += `<div class="pdf-content" style="${style}">${item.str}</div>`;
      });

      // Handle images if present
      if (page.images) {
        page.images.forEach((image) => {
          const imageStyle = `
            position: absolute;
            left: ${image.x}px;
            top: ${image.y}px;
            width: ${image.width}px;
            height: ${image.height}px;
          `;
          htmlContent += `<img src="data:image/${image.format};base64,${image.data}" style="${imageStyle}" />`;
        });
      }

      htmlContent += "</div>";
    });

    res.render("editor", {
      pdfContent: htmlContent,
      originalFile: req.file.filename,
      pdfMetadata: data.meta, // Pass metadata for preservation
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).send("Error processing PDF file");
  }
});

app.post("/export", async (req, res) => {
  try {
    const { content, metadata } = req.body;

    // Create a new PDF document with original page settings
    const doc = new PDFDocument({
      size: [metadata.width, metadata.height],
      margin: 0,
      info: metadata.info,
    });

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=edited-document.pdf"
    );

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Process and add the content while preserving formatting
    const elements = JSON.parse(content);
    elements.forEach((element) => {
      if (element.type === "text") {
        doc
          .font(element.fontFamily)
          .fontSize(element.fontSize)
          .fillColor(element.color)
          .text(element.content, element.x, element.y, {
            width: element.width,
            height: element.height,
            lineGap: element.lineHeight,
            align: element.align,
          });
      } else if (element.type === "image") {
        doc.image(element.src, element.x, element.y, {
          width: element.width,
          height: element.height,
        });
      }
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
