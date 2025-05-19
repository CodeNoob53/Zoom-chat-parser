# Zoom Chat Parser

A web application for parsing Zoom chat files and matching participants with a name database.

[English](README.md) | [Українська](docs/lang/README.uk.md)

## Features

- **Chat Processing**
  - Parse Zoom chat files
  - Extract participant information
  - Support for multiple chat formats
  - Real-time processing

- **Name Matching**
  - Match chat participants with database entries
  - Support for name variations
  - Fuzzy matching capabilities
  - Custom matching rules

- **Database Management**
  - Import/Export name databases
  - Multiple format support (TXT, CSV, JSON)
  - Database validation
  - Duplicate detection

- **User Interface**
  - Modern, responsive design
  - Dark/Light theme support
  - Drag-and-drop file upload
  - Real-time progress updates

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zoom-chat-parser.git
cd zoom-chat-parser
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Usage

### Basic Mode

1. Upload a Zoom chat file
2. The application will automatically process the file
3. View the parsed results in the interface

### Advanced Mode

1. Upload a name database file
2. Configure matching settings
3. Upload and process chat files
4. Export matched results

### Name Database Format

The name database should be in one of the following formats:

- **TXT**: One name per line
- **CSV**: Comma-separated values with headers
- **JSON**: Array of name objects

Example JSON format:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "variations": ["John", "J. Doe"]
  }
]
```

## Security

- Input file validation
- Content sanitization
- Secure file handling
- No data storage on server

## Development

### Project Structure

```
src/
├── core/           # Core functionality
├── features/       # Main features
├── ui/            # UI components
├── utils/         # Utilities
└── styles/        # CSS styles
```

### Dependencies

- Node.js 14+
- Modern web browser
- No external API dependencies

### Building

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[Code Noob](https://github.com/CodeNoob53)

## Version

2.1 (2025)
