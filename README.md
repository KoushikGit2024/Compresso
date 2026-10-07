# Compresso 🗜️

**Compresso** is a lightning-fast, fully client-side image compression and processing tool built for the modern web. It allows you to crop, compare, and compress images directly in your browser without any server-side processing—ensuring maximum privacy and blazing-fast performance.

## ✨ Features

- **Client-Side Processing**: All compression happens locally on your device using Web Workers. Your photos never leave your browser.
- **Extensive Format Support**: Seamlessly compress JPEGs, PNGs, WebPs, AVIFs, GIFs, TIFFs, BMPs, and HEIC files.
- **Precision Image Editor**: Built-in zooming, panning, and cropping to get your images framed perfectly before compression.
- **Interactive Visualizer**: A beautiful before-and-after slider canvas to compare original and compressed image quality in real-time.
- **Batch Processing**: Queue up multiple files, apply custom settings (Quality, Color depth, Scaling), and download them all together in a single ZIP archive.
- **Progressive Web App (PWA)**: Install Compresso on your desktop or mobile device for native-like offline usage.
- **Theming**: A highly polished, responsive UI with seamless Dark & Light mode transitions.

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) powered by [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Bundler**: Rollup (via Vite)
- **Image Processing**: Native HTML5 Canvas API

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/compresso.git
   ```
2. Navigate into the directory:
   ```bash
   cd compresso
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```

## 📜 License

This project is licensed under the MIT License.
