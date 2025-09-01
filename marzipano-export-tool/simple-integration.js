/**
 * Simple Equirectangular Integration for Marzipano
 * Copy this code and adapt the sceneId to your exported scene folder
 */

async function loadEquirectangularScene(viewer, sceneId = '0-lobby_cam_view01') {
    try {
        console.log(`🔄 Loading equirectangular scene: ${sceneId}`);
        
        // 1. Try to load metadata, fallback to standard structure
        let metadata;
        try {
            const response = await fetch(`tiles/${sceneId}/metadata.json`);
            metadata = await response.json();
            console.log('✅ Loaded metadata:', metadata.tileStructure);
        } catch (error) {
            console.warn('⚠️ Using fallback metadata structure');
            // Standard equirectangular structure (2:1 aspect ratio)
            metadata = {
                tileStructure: {
                    type: "equirectangular",
                    levels: [
                        { level: 0, width: 1024, height: 512, tilesX: 2, tilesY: 1, tileSize: 512 },
                        { level: 1, width: 2048, height: 1024, tilesX: 4, tilesY: 2, tileSize: 512 },
                        { level: 2, width: 4096, height: 2048, tilesX: 8, tilesY: 4, tileSize: 512 },
                        { level: 3, width: 8192, height: 4096, tilesX: 16, tilesY: 8, tileSize: 512 }
                    ]
                }
            };
        }
        
        // 2. Create image source with tile URL resolver
        const source = new Marzipano.ImageUrlSource((tile) => {
            if (tile == null) {
                // Return preview image for initial load
                const previewUrl = `tiles/${sceneId}/preview.jpg`;
                console.log(`📷 Loading preview: ${previewUrl}`);
                return { url: previewUrl };
            }
            
            // Calculate tile index for equirectangular tiles
            const levelInfo = metadata.tileStructure.levels[tile.z];
            if (!levelInfo) {
                console.error(`❌ No level info for z=${tile.z}`);
                return { url: `tiles/${sceneId}/preview.jpg` };
            }
            
            // Tile index = y * tilesPerRow + x
            const tileIndex = tile.y * levelInfo.tilesX + tile.x;
            const tileUrl = `tiles/${sceneId}/${tile.z}/${tileIndex}.jpg`;
            
            console.log(`🧩 Tile: z=${tile.z}, x=${tile.x}, y=${tile.y} -> index=${tileIndex} -> ${tileUrl}`);
            return { url: tileUrl };
        });
        
        // 3. Create equirectangular geometry
        const levels = metadata.tileStructure.levels.map(level => ({
            tileSize: level.tileSize,
            size: level.width  // Use width for equirectangular (height is width/2)
        }));
        
        const geometry = new Marzipano.EquirectGeometry(levels);
        console.log(`📐 Created geometry with ${levels.length} levels`);
        
        // 4. Create view
        const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100 * Math.PI / 180);
        const initialView = { yaw: 0, pitch: 0, fov: Math.PI / 4 };
        const view = new Marzipano.RectilinearView(initialView, limiter);
        
        // 5. Create and switch to scene
        const scene = viewer.createScene({
            source: source,
            geometry: geometry,
            view: view,
            pinFirstLevel: true  // Keep lowest resolution loaded
        });
        
        viewer.switchScene(scene);
        console.log('✅ Equirectangular scene loaded successfully!');
        
        return scene;
        
    } catch (error) {
        console.error('❌ Error loading equirectangular scene:', error);
        throw error;
    }
}

// Usage example:
/*
// Initialize viewer
const viewer = new Marzipano.Viewer(document.getElementById('viewer'));

// Load your exported scene
loadEquirectangularScene(viewer, '0-lobby_cam_view01')
    .then(scene => {
        console.log('Scene ready!', scene);
    })
    .catch(error => {
        console.error('Failed to load scene:', error);
    });
*/

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadEquirectangularScene };
}
