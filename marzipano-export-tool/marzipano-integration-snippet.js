/**
 * Marzipano Integration Example for Exported Tiled Images
 * 
 * This snippet shows how to load and render exported tiled panoramas
 * in Marzipano viewer with preview fallback and metadata.
 */

// Initialize Marzipano Viewer
const viewer = new Marzipano.Viewer(document.querySelector('#pano'));

/**
 * Load and create a scene from exported tiled images
 * @param {string} sceneFolder - Path to scene folder (e.g., 'scene_abc123')
 * @returns {Promise<Object>} Scene object with metadata
 */
async function loadTiledScene(sceneFolder) {
    try {
        // 1. Load scene metadata
        const metadata = await fetch(`${sceneFolder}/metadata.json`).then(r => r.json());
        console.log('Scene metadata:', metadata);
        
        // 2. Create ImageUrlSource with cube map preview fallback and tiles
        const source = new Marzipano.ImageUrlSource((tile) => {
            if (tile == null) {
                // Return cube map preview strip for fallback/initial loading
                return { 
                    url: `tiles/${sceneFolder}/preview.jpg`,
                    rect: null // Full preview strip will be used by Marzipano
                };
            }
            
            // Return specific cube map tile URL: tiles/{scene_id}/{level}/{face}/{y}/{x}.jpg
            const levelInfo = metadata.tileStructure.levels[tile.z];
            return { url: `tiles/${sceneFolder}/${tile.z}/${tile.face}/${tile.y}/${tile.x}.jpg` };
        });
        
        // 3. Create cube geometry from tile structure in metadata
        const levels = metadata.tileStructure.levels.map(level => ({
            tileSize: level.tileSize,
            size: level.faceSize
        }));
        const geometry = new Marzipano.CubeGeometry(levels);
        
        // 4. Create view with initial parameters from metadata
        const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100 * Math.PI / 180);
        const view = new Marzipano.RectilinearView(metadata.initialView, limiter);
        
        // 5. Create and configure scene
        const scene = viewer.createScene({
            source: source,
            geometry: geometry,
            view: view,
            pinFirstLevel: true  // Keep lowest resolution loaded
        });
        
        // 6. Add hotspots from metadata (they're also embedded in tile images)
        metadata.hotspots.forEach(hotspot => {
            const element = createHotspotElement(hotspot);
            scene.hotspotContainer().createHotspot(element, {
                yaw: hotspot.coordinates.yaw,
                pitch: hotspot.coordinates.pitch
            });
        });
        
        return { scene, metadata };
        
    } catch (error) {
        console.error('Error loading tiled scene:', error);
        throw error;
    }
}

/**
 * Create hotspot DOM element from metadata
 * @param {Object} hotspot - Hotspot data from metadata
 * @returns {HTMLElement} Hotspot element
 */
function createHotspotElement(hotspot) {
    const element = document.createElement('div');
    element.className = 'hotspot';
    element.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid ${hotspot.type === 'link' ? '#007bff' : '#28a745'};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
    `;
    
    // Set content and behavior based on type
    if (hotspot.type === 'link') {
        element.innerHTML = '🔗';
        element.title = `Go to: ${hotspot.title}`;
        element.onclick = () => {
            // Handle scene navigation
            if (hotspot.target) {
                loadTiledScene(`scene_${hotspot.target}`)
                    .then(({ scene }) => scene.switchTo());
            }
        };
    } else if (hotspot.type === 'info') {
        element.innerHTML = 'ℹ️';
        element.title = hotspot.title;
        element.onclick = () => {
            alert(hotspot.text || hotspot.title);
        };
    }
    
    return element;
}

/**
 * Load multiple scenes from manifest
 * @returns {Promise<Map>} Map of scene ID to scene data
 */
async function loadAllScenesFromManifest() {
    try {
        // Load manifest file
        const manifest = await fetch('manifest.json').then(r => r.json());
        console.log('Manifest:', manifest);
        
        const scenesMap = new Map();
        
        // Load each scene
        for (const sceneInfo of manifest.scenes) {
            console.log(`Loading scene: ${sceneInfo.name}`);
            
            const sceneData = await loadTiledScene(sceneInfo.folder);
            scenesMap.set(sceneInfo.id, {
                ...sceneData,
                info: sceneInfo
            });
        }
        
        return scenesMap;
        
    } catch (error) {
        console.error('Error loading scenes from manifest:', error);
        throw error;
    }
}

/**
 * Simple usage examples
 */

// Example 1: Load single scene
async function example1() {
    const { scene, metadata } = await loadTiledScene('scene_abc123');
    scene.switchTo();
    console.log('Scene loaded with metadata:', metadata);
}

// Example 2: Load all scenes from manifest
async function example2() {
    const scenes = await loadAllScenesFromManifest();
    
    // Switch to first scene
    const firstScene = scenes.values().next().value;
    if (firstScene) {
        firstScene.scene.switchTo();
        console.log('Loaded scenes:', scenes.size);
    }
}

// Example 3: Create scene switcher
async function example3() {
    const scenes = await loadAllScenesFromManifest();
    
    // Create buttons for each scene
    scenes.forEach((sceneData, sceneId) => {
        const button = document.createElement('button');
        button.textContent = sceneData.info.name;
        button.onclick = () => {
            sceneData.scene.switchTo();
            console.log(`Switched to: ${sceneData.info.name}`);
        };
        document.body.appendChild(button);
    });
}

// Auto-run example (uncomment to use)
// window.addEventListener('load', () => {
//     example2(); // Load all scenes from manifest
// });

/**
 * Expected folder structure:
 * 
 * your-project/
 * ├── index.html              (your HTML file with Marzipano)
 * ├── manifest.json           (from export)
 * ├── scene_abc123/           (from export)
 * │   ├── metadata.json
 * │   ├── preview.jpg
 * │   ├── level_0/
 * │   │   └── 0_0.jpg
 * │   ├── level_1/
 * │   │   ├── 0_0.jpg
 * │   │   └── 1_0.jpg
 * │   └── ...
 * └── scene_def456/           (additional scenes)
 *     └── ...
 */
