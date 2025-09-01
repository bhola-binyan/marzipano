# 🌐 Marzipano Export Tool

A comprehensive web-based tool for creating and exporting virtual tours using the Marzipano library. This tool allows you to upload panorama images, create interactive scenes with hotspots, and export complete standalone web applications.

## ✨ Features

- **📷 Image Upload**: Drag & drop or browse for panorama images
- **🎬 Scene Management**: Create multiple scenes from your images
- **📍 Interactive Hotspots**: Add link and information hotspots with embedded rendering
- **👁️ Live Preview**: Real-time preview of your virtual tour
- **🧩 Tiled Export**: Multi-resolution tiled images with embedded hotspots
- **🖼️ Preview Generation**: Low-res fallback images for smooth loading
- **📋 Complete Metadata**: JSON files with all scene and hotspot data
- **🔧 Marzipano Integration**: Ready-to-use examples and code snippets
- **⚙️ Customizable Settings**: Configure tour behavior and appearance

## 🚀 Getting Started

### Prerequisites

1. **Marzipano Library**: The tool requires `marzipano.js` to be built
2. **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
3. **Local Web Server** (recommended for file handling)

### Setup Instructions

1. **Clone or download** this repository
2. **Build Marzipano** (if not already done):
   ```bash
   cd path/to/marzipano
   npm install
   npm run dev  # This creates build/marzipano.js
   ```
3. **Copy the tool** to the Marzipano directory or ensure the correct path to `marzipano.js`
4. **Start a local server**:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Using Node.js
   npx http-server
   
   # Using PHP  
   php -S localhost:8080
   ```
5. **Open your browser** and navigate to `http://localhost:8080/marzipano-export-tool/`

## 📖 How to Use

### 1. 📷 Upload Images
- Click "browse files" or drag & drop panorama images
- Supports JPG and PNG formats
- Best results with equirectangular images (2:1 aspect ratio)

### 2. 🎬 Create Scenes
- Go to the "Scenes" tab
- Click "Create Scene" for each uploaded image
- Or use "Auto-Generate from Images" to create all scenes at once
- Edit scene names as needed

### 3. 📍 Add Hotspots
- Select a scene in the "Hotspots" tab
- Click on the preview image to place hotspots
- Choose hotspot type:
  - **Link**: Navigate to another scene
  - **Info**: Display information popup
- Fill in title and details

### 4. ⚙️ Configure Settings
- Set tour title and description
- Choose starting scene
- Enable/disable auto-rotation
- Adjust field of view and mouse controls

### 5. 👁️ Preview Tour
- Click "Generate Preview" to test your tour
- Use fullscreen mode for better experience
- Check hotspot functionality

### 6. 📦 Export Tour
- Review export statistics
- Set export filename
- Click "Export Tour (.zip)"
- Download contains complete web application

## 🔧 Technical Details

### Supported Image Formats
- **JPG/JPEG**: Recommended for photographs
- **PNG**: Supports transparency
- **Aspect Ratio**: 2:1 (equirectangular) works best

### Generated Export Structure
```
my-virtual-tour.zip
├── index.html          # Main tour file
├── style.css           # Tour styling
├── data.js            # Tour configuration
└── media/             # Image assets
    ├── scene_1.jpg
    ├── scene_2.jpg
    └── ...
```

### Browser Compatibility
- **Chrome/Chromium**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11+)
- **Edge**: Full support

## 🎨 Customization

### Modifying Tour Appearance
Edit the generated `style.css` in exported tours to customize:
- Colors and themes
- Layout positioning
- Hotspot styling
- UI elements

### Adding Custom Features
The exported tour includes:
- **Marzipano integration**: Full API access
- **Scene navigation**: Easy to extend
- **Hotspot system**: Customizable interactions
- **Responsive design**: Mobile-friendly

## 📝 Example Workflow

1. **Prepare Images**: Take 360° photos or render panoramas
2. **Upload**: Add all images to the tool
3. **Auto-Generate**: Create scenes for all images
4. **Link Scenes**: Add navigation hotspots between scenes
5. **Add Information**: Include info hotspots with descriptions
6. **Configure**: Set title, description, and starting scene
7. **Preview**: Test the complete tour
8. **Export**: Generate and download the web application
9. **Deploy**: Upload to your web server

## 🐛 Troubleshooting

### Common Issues

**Images not loading:**
- Check file format (JPG/PNG only)
- Ensure files aren't corrupted
- Try smaller file sizes

**Preview not working:**
- Verify at least one scene exists
- Check that scenes have associated images
- Ensure browser supports WebGL

**Export problems:**
- Check browser supports JSZip
- Verify all scenes have images
- Try with fewer/smaller images

**Hotspots not appearing:**
- Ensure scene is selected before placing
- Click directly on the preview image
- Fill out all required hotspot fields

### Performance Tips

- **Optimize Images**: Use appropriate resolutions (4K max recommended)
- **Limit Scenes**: Large numbers of scenes may impact performance  
- **Compress Images**: Balance quality vs. file size
- **Test Regularly**: Preview frequently during development

## 🧩 Marzipano Integration Examples

The tool includes complete integration examples for using exported tiled images:

### Files Included:
- **`marzipano-integration-example.html`** - Complete working HTML example  
- **`marzipano-integration-snippet.js`** - Clean JavaScript code snippets

### Quick Integration:
```javascript
// Load scene with tiled images and preview
const { scene, metadata } = await loadTiledScene('scene_abc123');
scene.switchTo();

// Automatically handles:
// - Preview image fallback (1024x512)
// - Multi-resolution tiles (4 levels)
// - Embedded hotspot rendering
```

### Export Structure:
```
your-project/
├── manifest.json           (scene list & settings)
└── scene_abc123/           (per scene)
    ├── metadata.json       (scene data)
    ├── preview.jpg         (fallback image)
    └── level_0/ to level_3/ (multi-res tiles)
```

## 🤝 Contributing

This tool is built on the Marzipano library by Google. Contributions welcome!

### Development Setup
1. Modify `app.js` for functionality changes
2. Update `styles.css` for UI improvements  
3. Test with various image types and sizes
4. Ensure cross-browser compatibility

## 📄 License

Built using Marzipano (Apache 2.0 License).
Tool code available under the same license.

## 🔗 Related Resources

- [Marzipano Library](https://www.marzipano.net/)
- [Marzipano Documentation](https://www.marzipano.net/docs.html)
- [Virtual Tour Best Practices](https://www.marzipano.net/demos.html)

---

**Happy touring! 🌐**
