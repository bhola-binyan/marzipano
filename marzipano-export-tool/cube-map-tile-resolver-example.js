/**
 * Cube Map Tile URL Resolver Example
 * 
 * This example shows how to create a reusable tile URL resolver
 * for cube map panoramas exported from the Marzipano Export Tool.
 */

/**
 * Creates a tile URL resolver for cube map panoramas
 * @param {string} sceneId - The scene identifier (e.g., '0-lobby_cam_view01')
 * @param {string} basePath - Base path to panoramas (e.g., 'tiles')
 * @param {Object} options - Additional options
 * @returns {Function} Tile URL resolver function for Marzipano
 */
const createCubeMapTileUrlResolver = (sceneId, basePath = 'tiles', options = {}) => {
  const {
    crossOrigin = 'anonymous',
    cubeMapPreviewFaceOrder = 'bdflru',
    fallbackUrl = null
  } = options;

  // Construct base URLs
  const sceneBasePath = `${basePath}/${sceneId}`;
  const previewUrl = fallbackUrl || `${sceneBasePath}/preview.jpg`;

  return tile => {
    if (tile == null) {
      // Return preview image for fallback/initial loading
      return {
        url: previewUrl,
        crossOrigin: crossOrigin
      };
    }

    // Construct specific cube map tile URL
    // Format: tiles/{sceneId}/{level}/{face}/{y}/{x}.jpg
    const tileUrl = `${sceneBasePath}/${tile.z}/${tile.face}/${tile.y}/${tile.x}.jpg`;

    return {
      url: tileUrl,
      crossOrigin: crossOrigin,
      // Include cube map preview info for reference
      cubeMapPreviewUrl: previewUrl,
      cubeMapPreviewFaceOrder: cubeMapPreviewFaceOrder
    };
  };
};

/**
 * Alternative: Template-based tile URL resolver (similar to your example)
 * Uses string templates with placeholders that get replaced
 */
const createTemplateBasedResolver = (urlTemplate, previewUrl, options = {}) => {
  const {
    crossOrigin = 'anonymous',
    cubeMapPreviewFaceOrder = 'bdflru'
  } = options;

  return tile => {
    if (tile == null) {
      // Preview image for fallback/loading
      return { 
        url: previewUrl,
        crossOrigin: crossOrigin
      };
    }

    // Replace template placeholders with actual tile values
    const tileUrl = urlTemplate
      .replace('{level}', tile.z)
      .replace('{z}', tile.z)           // Alternative level placeholder
      .replace('{face}', tile.face)
      .replace('{f}', tile.face)        // Alternative face placeholder  
      .replace('{x}', tile.x)
      .replace('{y}', tile.y);

    return {
      url: tileUrl,
      crossOrigin: crossOrigin,
      cubeMapPreviewUrl: previewUrl,
      cubeMapPreviewFaceOrder: cubeMapPreviewFaceOrder
    };
  };
};

/**
 * Usage Examples
 */

// Example 1: Using the cube map resolver
const resolver1 = createCubeMapTileUrlResolver(
  'scene_id_5o6sy08i8',
  'panos',
  { 
    crossOrigin: 'anonymous',
    cubeMapPreviewFaceOrder: 'bdflru'
  }
);

// Example 2: Using template-based resolver (similar to your style)
const resolver2 = createTemplateBasedResolver(
  'panos/scene_id_5o6sy08i8/{level}/{face}/{x}_{y}.jpg',
  'panos/scene_id_5o6sy08i8/preview.jpg',
  {
    crossOrigin: 'anonymous',
    cubeMapPreviewFaceOrder: 'bdflru'
  }
);

// Example 3: Your exact style adapted for cube maps
const createTileUrlResolver = (sceneId, fallbackUrl) => {
  return tile => {
    if (tile == null) {
      // Preview image for fallback/loading
      return { url: fallbackUrl };
    }

    // Specific cube map tile URL - construct tile path based on scene ID and tile coordinates  
    // Format: tiles/{sceneId}/{level}/{face}/{y}/{x}.jpg
    const tileUrl = `tiles/${sceneId}/${tile.z}/${tile.face}/${tile.y}/${tile.x}.jpg`;

    return {
      url: tileUrl,
      crossOrigin: 'anonymous',
      cubeMapPreviewUrl: fallbackUrl,
      cubeMapPreviewFaceOrder: 'bdflru'
    };
  };
};

/**
 * Complete Marzipano Integration Example
 */
async function loadCubeMapScene(sceneId, containerId = '#pano') {
  try {
    // Initialize Marzipano viewer
    const viewer = new Marzipano.Viewer(document.querySelector(containerId));

    // Load scene metadata
    const metadata = await fetch(`panos/${sceneId}/metadata.json`).then(r => r.json());

    // Method 1: Use the cube map resolver
    const tileResolver = createCubeMapTileUrlResolver(sceneId, 'panos');
    const source1 = new Marzipano.ImageUrlSource(tileResolver);

    // Method 2: Use Marzipano's built-in URL template (most efficient)
    const source2 = Marzipano.ImageUrlSource.fromString(
      `panos/${sceneId}/{z}/{f}/{x}_{y}.jpg`,
      {
        cubeMapPreviewUrl: `panos/${sceneId}/preview.jpg`,
        cubeMapPreviewFaceOrder: 'bdflru'
      }
    );

    // Method 3: Use your style (template replacement)
    const tileResolver3 = createTileUrlResolver(
      sceneId, 
      `panos/${sceneId}/preview.jpg`
    );
    const source3 = new Marzipano.ImageUrlSource(tileResolver3);

    // Create cube geometry from metadata
    const levels = metadata.tileStructure.levels.map(level => ({
      tileSize: level.tileSize,
      size: level.size
    }));
    const geometry = new Marzipano.CubeGeometry(levels);

    // Create view
    const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100 * Math.PI / 180);
    const view = new Marzipano.RectilinearView(metadata.initialView, limiter);

    // Create scene (using source2 - most efficient)
    const scene = viewer.createScene({
      source: source2,  // or source1, source3
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Switch to scene
    scene.switchTo();

    console.log(`✅ Loaded cube map scene: ${sceneId}`);
    return { viewer, scene, metadata };

  } catch (error) {
    console.error(`❌ Failed to load scene ${sceneId}:`, error);
    throw error;
  }
}

/**
 * Usage Examples:
 */

// Load a specific scene
loadCubeMapScene('scene_id_5o6sy08i8');

// Load with custom container
loadCubeMapScene('scene_id_abc123', '#my-panorama-container');

// Create multiple resolvers for different scenes
const lobby = createTileUrlResolver('scene_id_lobby', 'panos/scene_id_lobby/preview.jpg');
const office = createTileUrlResolver('scene_id_office', 'panos/scene_id_office/preview.jpg');
const meeting = createTileUrlResolver('scene_id_meeting', 'panos/scene_id_meeting/preview.jpg');

// Use with Marzipano
const lobbySource = new Marzipano.ImageUrlSource(lobby);
const officeSource = new Marzipano.ImageUrlSource(office);
const meetingSource = new Marzipano.ImageUrlSource(meeting);

/**
 * Advanced: Dynamic scene switcher
 */
const createSceneSwitcher = (sceneConfigs, basePath = 'panos') => {
  const scenes = new Map();
  const viewer = new Marzipano.Viewer(document.querySelector('#pano'));

  // Pre-load all scene configurations
  sceneConfigs.forEach(config => {
    const resolver = createCubeMapTileUrlResolver(config.sceneId, basePath);
    scenes.set(config.sceneId, {
      ...config,
      resolver: resolver,
      source: new Marzipano.ImageUrlSource(resolver)
    });
  });

  return {
    switchToScene: async (sceneId) => {
      const sceneConfig = scenes.get(sceneId);
      if (!sceneConfig) {
        throw new Error(`Scene not found: ${sceneId}`);
      }

      // Load metadata if not already loaded
      if (!sceneConfig.metadata) {
        sceneConfig.metadata = await fetch(`${basePath}/${sceneId}/metadata.json`)
          .then(r => r.json());
      }

      // Create geometry and view if not already created
      if (!sceneConfig.scene) {
        const levels = sceneConfig.metadata.tileStructure.levels.map(level => ({
          tileSize: level.tileSize,
          size: level.size
        }));
        const geometry = new Marzipano.CubeGeometry(levels);
        const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100 * Math.PI / 180);
        const view = new Marzipano.RectilinearView(sceneConfig.metadata.initialView, limiter);

        sceneConfig.scene = viewer.createScene({
          source: sceneConfig.source,
          geometry: geometry,
          view: view,
          pinFirstLevel: true
        });
      }

      // Switch to scene
      sceneConfig.scene.switchTo();
      console.log(`🎬 Switched to scene: ${sceneConfig.name || sceneId}`);
    },

    getScenes: () => Array.from(scenes.keys()),
    getViewer: () => viewer
  };
};

// Usage:
const sceneSwitcher = createSceneSwitcher([
  { sceneId: 'scene_id_lobby', name: 'Lobby' },
  { sceneId: 'scene_id_office', name: 'Office' },
  { sceneId: 'scene_id_meeting', name: 'Meeting Room' }
]);

// Switch scenes
sceneSwitcher.switchToScene('scene_id_lobby');
sceneSwitcher.switchToScene('scene_id_office');


