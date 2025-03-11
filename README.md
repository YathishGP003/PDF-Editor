# PDF to Web Editor

A web application that allows users to upload PDF documents, edit them in a web editor, and export them back to PDF with preserved formatting.

## Features

- Upload PDF documents
- Edit content in a rich text editor (TinyMCE)
- Export edited content back to PDF
- Preserve formatting and layout

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/pdf-editor.git
   cd pdf-editor
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the application:

   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a PDF file using the upload form on the home page
2. Edit the content in the TinyMCE editor
3. Click "Export to PDF" to download the edited document

## Technologies Used

- Node.js and Express.js for the backend
- TinyMCE for the rich text editor
- pdf.js-extract for PDF content extraction
- html-pdf-node for PDF generation
- EJS for templating

## License

MIT
