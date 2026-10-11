/**
 * File parsing utilities for PDF and EPUB files
 */

/**
 * Parse a PDF file and extract its text content
 * @param {File} file - The PDF file to parse
 * @returns {Promise<string>} The extracted text
 */
export async function parsePDF(file) {
  const pdfjsLib = await import('pdfjs-dist')

  // Bundle the worker so local PDF import does not depend on a CDN.
  pdfjsLib.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .filter(item => 'str' in item)
      .map(item => /** @type {{ str: string }} */ (item).str)
      .join(' ')
    fullText += pageText + ' '
  }

  // Clean up the text
  return cleanText(fullText)
}

/**
 * Parse an EPUB file and extract its text content
 * @param {File} file - The EPUB file to parse
 * @returns {Promise<string>} The extracted text
 */
export async function parseEPUBDocument(file) {
  const ePub = (await import('epubjs')).default

  const arrayBuffer = await file.arrayBuffer()
  const book = ePub(arrayBuffer)

  await book.ready
  await book.loaded.spine

  let fullText = ''
  let wordOffset = 0
  const chapters = []
  const navigation = await book.loaded.navigation
  const metadata = await book.loaded.metadata
  const toc = []
  function collect(items = []) { for (const entry of items) { toc.push(entry); collect(entry.subitems); } }
  collect(navigation?.toc)

  // Get spine items - the API varies between versions
  const spineItems = book.spine?.spineItems || book.spine?.items || []

  for (const item of spineItems) {
    try {
      // Load the section content using the book's load method
      const href = item.href || item.url
      if (!href) continue

      const contents = await book.load(href)
      if (contents) {
        let text = ''
        // contents can be a Document, string, or XML document
        if (typeof contents === 'string') {
          const doc = new DOMParser().parseFromString(contents, 'text/html')
          text = doc.body?.textContent || ''
        } else if (contents.body) {
          text = contents.body.textContent || ''
        } else if (contents.documentElement) {
          text = contents.documentElement.textContent || ''
        }
        const cleaned = cleanText(text)
        if (cleaned) {
          const entry = toc.find(t => t.href?.split('#')[0] === href.split('#')[0] || href.endsWith(t.href?.split('#')[0]))
          const heading = typeof contents === 'string' ? new DOMParser().parseFromString(contents, 'text/html').querySelector('h1,h2,h3')?.textContent : contents.querySelector?.('h1,h2,h3')?.textContent
          chapters.push({ title: entry?.label?.trim() || heading?.trim() || `Section ${chapters.length + 1}`, wordIndex: wordOffset })
          fullText += cleaned + ' '
          wordOffset += cleaned.split(/\s+/).length
        }
      }
    } catch (e) {
      book.destroy?.()
      throw new Error(`Could not import EPUB section ${item.href || item.url}: ${e.message}`)
    }
  }

  // Clean up the text
  book.destroy?.()
  return { text: cleanText(fullText), title: metadata?.title, author: metadata?.creator, chapters }
}

export async function parseEPUB(file) { return (await parseEPUBDocument(file)).text }

export async function parseDocument(file) {
  if (file.name.toLowerCase().endsWith('.epub')) return parseEPUBDocument(file)
  return { text: await parseFile(file), chapters: [] }
}

/**
 * Clean and normalize extracted text
 * @param {string} text - The raw text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  return text
    // Replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    // Remove excessive punctuation
    .replace(/([.!?])\1+/g, '$1')
    // Trim
    .trim()
}

/**
 * Detect file type and parse accordingly
 * @param {File} file - The file to parse
 * @returns {Promise<string>} The extracted text
 */
export async function parseFile(file) {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.pdf')) {
    return parsePDF(file)
  } else if (fileName.endsWith('.epub')) {
    return parseEPUB(file)
  } else if (/\.(txt|md)$/.test(fileName)) {
    return cleanText(await file.text())
  } else {
    throw new Error(`Unsupported file type: ${fileName}`)
  }
}

/**
 * Get supported file extensions
 * @returns {string} Comma-separated list of supported extensions
 */
export function getSupportedExtensions() {
  return '.pdf,.epub,.txt,.md'
}
