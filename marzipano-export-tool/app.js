/**
 * Marzipano Export Tool
 * Creates complete virtual tours and exports them as web applications
 */

class MarzipanoExportTool {
    constructor() {
        this.images = new Map();
        this.scenes = new Map();
        this.hotspots = new Map();
        this.settings = {
            title: 'My Virtual Tour',
            description: 'An amazing virtual tour experience',
            startingScene: null,
            autorotate: false,
            maxFov: 100,
            mouseViewMode: 'drag'
        };
        this.currentViewer = null;
        this.currentScene = null;
        this.isEditingHotspot = false;
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupImageUpload();
        this.setupSceneManagement();
        this.setupHotspotEditor();
        this.setupSettings();
        this.setupPreview();
        this.setupExport();
        this.setupModal();
        
        console.log('🌐 Marzipano Export Tool initialized');
    }

    // Tab Management
    setupTabs() {
        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');

        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = link.dataset.tab;

                // Update active states
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                link.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    // Image Upload and Processing
    setupImageUpload() {
        const dropZone = document.getElementById('dropZone');
        const imageUpload = document.getElementById('imageUpload');
        const imagesList = document.getElementById('imagesList');

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        // File input
        imageUpload.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files);
        });

        // Click to upload
        dropZone.addEventListener('click', () => {
            imageUpload.click();
        });
    }

    handleFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                this.processImage(file);
            }
        });
    }

    processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const imageData = {
                    id: this.generateId(),
                    file: file,
                    name: file.name,
                    url: e.target.result,
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height,
                    size: file.size
                };
                
                this.images.set(imageData.id, imageData);
                this.renderImageCard(imageData);
                this.updateStats();
                
                console.log('📷 Image processed:', imageData.name);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    renderImageCard(imageData) {
        const imagesList = document.getElementById('imagesList');
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <img src="${imageData.url}" alt="${imageData.name}" class="image-preview" onclick="tool.showImagePreview('${imageData.id}')">
            <div class="image-info">
                <div class="image-name">${imageData.name}</div>
                <div class="image-details">
                    ${imageData.width} × ${imageData.height} 
                    (${(imageData.size / 1024 / 1024).toFixed(2)} MB)
                    <br>Aspect Ratio: ${imageData.aspectRatio.toFixed(2)}:1
                </div>
                <div class="image-actions">
                    <button class="btn btn-primary" onclick="tool.createSceneFromImage('${imageData.id}')">
                        🎬 Create Scene
                    </button>
                    <button class="btn btn-secondary" onclick="tool.removeImage('${imageData.id}')">
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
        imagesList.appendChild(card);
    }

    removeImage(imageId) {
        if (confirm('Are you sure you want to remove this image?')) {
            this.images.delete(imageId);
            this.renderImages();
            this.updateStats();
        }
    }

    renderImages() {
        const imagesList = document.getElementById('imagesList');
        imagesList.innerHTML = '';
        this.images.forEach(imageData => {
            this.renderImageCard(imageData);
        });
    }

    // Scene Management
    setupSceneManagement() {
        document.getElementById('addSceneBtn').addEventListener('click', () => {
            this.createScene();
        });

        document.getElementById('autoGenerateScenesBtn').addEventListener('click', () => {
            this.autoGenerateScenes();
        });
    }

    createScene(imageId = null) {
        const imageData = imageId ? this.images.get(imageId) : null;
        const scene = {
            id: this.generateId(),
            name: imageData ? `Scene ${imageData.name}` : `Scene ${this.scenes.size + 1}`,
            imageId: imageId,
            imageUrl: imageData ? imageData.url : null,
            initialView: {
                yaw: 0,
                pitch: 0,
                fov: Math.PI / 2
            },
            levels: this.generateLevels(imageData),
            hotspots: []
        };

        this.scenes.set(scene.id, scene);
        this.renderScenes();
        this.updateSceneSelects();
        this.updateStats();
        
        console.log('🎬 Scene created:', scene.name);
        
        // Switch to scenes tab
        document.querySelector('[data-tab="scenes"]').click();
    }

    createSceneFromImage(imageId) {
        this.createScene(imageId);
    }

    generateLevels(imageData) {
        if (!imageData) return [];
        
        const width = imageData.width;
        const levels = [];
        
        // Generate multiple resolution levels
        let currentWidth = Math.min(width, 4096);
        while (currentWidth >= 512) {
            levels.push({
                width: currentWidth,
                height: Math.round(currentWidth / 2) // Assume equirectangular 2:1 ratio
            });
            currentWidth = Math.floor(currentWidth / 2);
        }
        
        return levels.reverse(); // Start with smallest level
    }

    autoGenerateScenes() {
        if (this.images.size === 0) {
            alert('Please add some images first!');
            return;
        }

        let count = 0;
        this.images.forEach((imageData, imageId) => {
            if (!this.isImageUsedInScene(imageId)) {
                this.createScene(imageId);
                count++;
            }
        });

        if (count > 0) {
            alert(`Created ${count} scenes from uploaded images!`);
        } else {
            alert('All images are already used in scenes.');
        }
    }

    isImageUsedInScene(imageId) {
        for (let scene of this.scenes.values()) {
            if (scene.imageId === imageId) {
                return true;
            }
        }
        return false;
    }

    renderScenes() {
        const scenesList = document.getElementById('scenesList');
        scenesList.innerHTML = '';

        this.scenes.forEach(scene => {
            const card = document.createElement('div');
            card.className = 'scene-card';
            card.innerHTML = `
                <div class="scene-header">
                    <div class="scene-title">${scene.name}</div>
                    <div class="scene-actions">
                        <button class="btn btn-primary" onclick="tool.editScene('${scene.id}')">✏️ Edit</button>
                        <button class="btn btn-secondary" onclick="tool.removeScene('${scene.id}')">🗑️ Remove</button>
                    </div>
                </div>
                ${scene.imageUrl ? `<img src="${scene.imageUrl}" class="scene-preview" alt="${scene.name}">` : '<div class="scene-preview"></div>'}
                <div class="scene-info">
                    <p>Hotspots: ${scene.hotspots.length}</p>
                    ${scene.imageId ? `<p>Image: ${this.images.get(scene.imageId)?.name || 'Unknown'}</p>` : '<p>No image assigned</p>'}
                </div>
            `;
            scenesList.appendChild(card);
        });
    }

    editScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene) return;

        const newName = prompt('Enter new scene name:', scene.name);
        if (newName && newName.trim()) {
            scene.name = newName.trim();
            this.renderScenes();
            this.updateSceneSelects();
        }
    }

    removeScene(sceneId) {
        if (confirm('Are you sure you want to remove this scene and all its hotspots?')) {
            this.scenes.delete(sceneId);
            this.renderScenes();
            this.updateSceneSelects();
            this.updateStats();
        }
    }

    updateSceneSelects() {
        const selects = ['hotspotSceneSelect', 'startingScene', 'hotspotTarget'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select a scene...</option>';
                
                this.scenes.forEach(scene => {
                    const option = document.createElement('option');
                    option.value = scene.id;
                    option.textContent = scene.name;
                    if (selectId === 'hotspotTarget' && currentValue === scene.id) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                
                if (selectId !== 'hotspotTarget') {
                    select.value = currentValue;
                }
            }
        });
    }

    // Hotspot Management
    setupHotspotEditor() {
        const sceneSelect = document.getElementById('hotspotSceneSelect');
        const addHotspotBtn = document.getElementById('addHotspotBtn');
        const previewViewport = document.getElementById('previewViewport');

        sceneSelect.addEventListener('change', () => {
            this.loadSceneForHotspotEditing(sceneSelect.value);
        });

        addHotspotBtn.addEventListener('click', () => {
            if (!sceneSelect.value) {
                alert('Please select a scene first!');
                return;
            }
            this.addHotspot(sceneSelect.value);
        });
    }

    loadSceneForHotspotEditing(sceneId) {
        const viewport = document.getElementById('previewViewport');
        
        if (!sceneId) {
            viewport.innerHTML = '<p>📍 Select a scene to add hotspots</p>';
            return;
        }

        const scene = this.scenes.get(sceneId);
        if (!scene || !scene.imageUrl) {
            viewport.innerHTML = '<p>❌ Scene has no image</p>';
            return;
        }

        // Show loading state
        viewport.innerHTML = '<p>🔄 Opening scene preview...</p>';
        
        // Setup the modal viewer
        this.setupMiniViewer(scene);
    }

    setupMiniViewer(scene) {
        // Create modal preview instead of inline preview
        const modal = document.createElement('div');
        modal.className = 'hotspot-preview-modal';
        modal.innerHTML = `
            <div class="hotspot-preview-backdrop">
                <div class="hotspot-preview-container">
                    <div class="hotspot-preview-header">
                        <h3>📍 Adding Hotspots to "${scene.name}"</h3>
                        <button class="close-hotspot-preview">&times;</button>
                    </div>
                    <div class="hotspot-preview-content" id="hotspotViewerContainer">
                        <div class="hotspot-instructions">
                            <p>💡 <strong>Click anywhere on the image to add a hotspot</strong></p>
                            <p>Use mouse/touch to navigate the panorama</p>
                        </div>
                    </div>
                    <div class="hotspot-preview-info">
                        <p>Scene: ${scene.name}</p>
                        <p>Current hotspots: ${scene.hotspots.length}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(modal);
        
        // Get the viewer container after modal is added to DOM
        const container = modal.querySelector('#hotspotViewerContainer');
        
        // Create Marzipano viewer
        const viewer = new Marzipano.Viewer(container);
        
        // Create source and geometry
        const source = new Marzipano.ImageUrlSource(() => ({
            url: scene.imageUrl
        }));
        
        const geometry = new Marzipano.EquirectGeometry(scene.levels);
        const view = new Marzipano.RectilinearView(scene.initialView);
        
        const marzipanoScene = viewer.createScene({
            source: source,
            geometry: geometry,
            view: view
        });

        marzipanoScene.switchTo();
        
        // Add click listener for hotspot creation
        container.addEventListener('click', (e) => {
            if (this.isEditingHotspot) return;
            
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Convert screen coordinates to spherical coordinates
            const coords = view.screenToCoordinates({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            if (coords) {
                this.showHotspotModal(scene.id, coords);
                // Update hotspot count in modal info
                const infoText = modal.querySelector('.hotspot-preview-info p:last-child');
                if (infoText) {
                    infoText.textContent = `Current hotspots: ${scene.hotspots.length}`;
                }
            }
        });

        // Add close handlers
        const closeBtn = modal.querySelector('.close-hotspot-preview');
        const backdrop = modal.querySelector('.hotspot-preview-backdrop');
        
        const closeModal = () => {
            document.body.removeChild(modal);
            // Reset viewport to show selection message
            const viewport = document.getElementById('previewViewport');
            viewport.innerHTML = '<p>Select a scene to add hotspots</p>';
            this.currentViewer = null;
            this.currentScene = null;
        };
        
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        this.currentViewer = viewer;
        this.currentScene = scene;
        
        // Update the original viewport to show that preview is open
        const viewport = document.getElementById('previewViewport');
        viewport.innerHTML = '<p>✨ Scene preview opened in modal</p>';
    }

    addHotspot(sceneId) {
        // Check if scene preview is open
        if (!this.currentViewer || !this.currentScene) {
            alert('Please select a scene and wait for the preview to load first!');
            return;
        }
        
        this.isEditingHotspot = true;
        
        // Highlight the instructions in the modal
        const instructionsElement = document.querySelector('.hotspot-instructions');
        if (instructionsElement) {
            instructionsElement.style.background = 'rgba(40, 167, 69, 0.95)';
            instructionsElement.style.animation = 'pulse 2s ease-in-out';
            
            // Reset after 3 seconds
            setTimeout(() => {
                instructionsElement.style.background = 'rgba(0, 123, 255, 0.9)';
                instructionsElement.style.animation = 'fadeIn 0.5s ease';
            }, 3000);
        }
    }

    showHotspotModal(sceneId, coords) {
        this.isEditingHotspot = false;
        
        // Store current hotspot data
        this.currentHotspotData = {
            sceneId: sceneId,
            coords: coords
        };

        // Show modal
        const modal = document.getElementById('hotspotModal');
        if (modal) {
            modal.style.display = 'block';
            // Update target scene options
            this.updateSceneSelects();
        }
    }

    setupModal() {
        const modal = document.getElementById('hotspotModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelHotspot');
        const hotspotForm = document.getElementById('hotspotForm');
        const hotspotType = document.getElementById('hotspotType');

        // Check if all elements exist
        if (!modal || !closeBtn || !cancelBtn || !hotspotForm || !hotspotType) {
            console.error('Modal elements not found. Check HTML structure.');
            return;
        }

        const hideModal = () => {
            modal.style.display = 'none';
            // Reset form when closing
            hotspotForm.reset();
            // Reset type display
            document.getElementById('hotspotTargetGroup').style.display = 'block';
            document.getElementById('hotspotTextGroup').style.display = 'none';
        };

        closeBtn.addEventListener('click', hideModal);
        cancelBtn.addEventListener('click', hideModal);

        hotspotType.addEventListener('change', () => {
            const targetGroup = document.getElementById('hotspotTargetGroup');
            const textGroup = document.getElementById('hotspotTextGroup');
            
            if (targetGroup && textGroup) {
                if (hotspotType.value === 'info') {
                    targetGroup.style.display = 'none';
                    textGroup.style.display = 'block';
                } else {
                    targetGroup.style.display = 'block';
                    textGroup.style.display = 'none';
                }
            }
        });

        hotspotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHotspot();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                hideModal();
            }
        });
    }

    saveHotspot() {
        const title = document.getElementById('hotspotTitle').value;
        const type = document.getElementById('hotspotType').value;
        const target = document.getElementById('hotspotTarget').value;
        const text = document.getElementById('hotspotText').value;

        if (!title.trim()) {
            alert('Please enter a title for the hotspot');
            return;
        }

        if (type === 'link' && !target) {
            alert('Please select a target scene');
            return;
        }

        if (type === 'info' && !text.trim()) {
            alert('Please enter information text');
            return;
        }

        const hotspot = {
            id: this.generateId(),
            sceneId: this.currentHotspotData.sceneId,
            title: title.trim(),
            type: type,
            coords: this.currentHotspotData.coords,
            target: type === 'link' ? target : null,
            text: type === 'info' ? text.trim() : null
        };

        // Add hotspot to scene
        const scene = this.scenes.get(this.currentHotspotData.sceneId);
        scene.hotspots.push(hotspot);

        // Clear form and close modal
        const form = document.getElementById('hotspotForm');
        const modal = document.getElementById('hotspotModal');
        
        if (form) form.reset();
        if (modal) modal.style.display = 'none';
        
        // Reset type display
        const targetGroup = document.getElementById('hotspotTargetGroup');
        const textGroup = document.getElementById('hotspotTextGroup');
        if (targetGroup) targetGroup.style.display = 'block';
        if (textGroup) textGroup.style.display = 'none';
        
        this.updateStats();
        console.log('📍 Hotspot added:', hotspot.title);
    }

    // Settings Management
    setupSettings() {
        const form = document.getElementById('settingsForm');
        const maxFovSlider = document.getElementById('maxFov');
        const maxFovValue = document.getElementById('maxFovValue');

        // Update FOV display
        maxFovSlider.addEventListener('input', () => {
            maxFovValue.textContent = maxFovSlider.value + '°';
        });

        // Save settings when changed
        form.addEventListener('change', () => {
            this.settings.title = document.getElementById('tourTitle').value;
            this.settings.description = document.getElementById('tourDescription').value;
            this.settings.startingScene = document.getElementById('startingScene').value;
            this.settings.autorotate = document.getElementById('autorotateEnabled').checked;
            this.settings.maxFov = parseInt(document.getElementById('maxFov').value);
            this.settings.mouseViewMode = document.getElementById('mouseViewMode').value;
        });
    }

    // Preview System
    setupPreview() {
        document.getElementById('generatePreviewBtn').addEventListener('click', () => {
            this.generatePreview();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }

    generatePreview() {
        const previewContainer = document.getElementById('tourPreview');
        
        if (this.scenes.size === 0) {
            alert('Please create at least one scene!');
            return;
        }

        previewContainer.innerHTML = '';
        
        // Create Marzipano viewer
        const viewer = new Marzipano.Viewer(previewContainer);
        
        // Get starting scene
        let startingScene = null;
        if (this.settings.startingScene) {
            startingScene = this.scenes.get(this.settings.startingScene);
        }
        if (!startingScene) {
            startingScene = this.scenes.values().next().value;
        }

        if (!startingScene.imageUrl) {
            alert('Starting scene has no image!');
            return;
        }

        // Create and display scene
        const source = new Marzipano.ImageUrlSource(() => ({
            url: startingScene.imageUrl
        }));
        
        const geometry = new Marzipano.EquirectGeometry(startingScene.levels);
        const view = new Marzipano.RectilinearView(startingScene.initialView);
        
        const marzipanoScene = viewer.createScene({
            source: source,
            geometry: geometry,
            view: view
        });

        // Add hotspots
        startingScene.hotspots.forEach(hotspot => {
            const element = this.createHotspotElement(hotspot);
            marzipanoScene.hotspotContainer().createHotspot(element, hotspot.coords);
        });

        marzipanoScene.switchTo();
        
        console.log('👁️ Preview generated');
    }

    createHotspotElement(hotspot) {
        const element = document.createElement('div');
        element.className = 'hotspot';
        element.innerHTML = `
            <div class="hotspot-icon">${hotspot.type === 'link' ? '🔗' : 'ℹ️'}</div>
            <div class="hotspot-title">${hotspot.title}</div>
        `;
        
        element.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #007bff;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        element.addEventListener('click', () => {
            if (hotspot.type === 'info') {
                alert(hotspot.text);
            } else if (hotspot.type === 'link') {
                // In a real implementation, this would switch scenes
                alert(`Would navigate to: ${this.scenes.get(hotspot.target)?.name || 'Unknown scene'}`);
            }
        });

        return element;
    }

    toggleFullscreen() {
        const container = document.getElementById('tourPreview');
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log('Fullscreen not supported or denied');
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Export System
    setupExport() {
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportTour();
        });
    }

    async exportTour() {
        if (this.scenes.size === 0) {
            alert('Please create at least one scene before exporting!');
            return;
        }

        const exportBtn = document.getElementById('exportBtn');
        const exportProgress = document.getElementById('exportProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        try {
            exportBtn.disabled = true;
            exportProgress.style.display = 'block';
            
            // Create ZIP file
            const zip = new JSZip();
            
            // Update progress
            progressText.textContent = 'Preparing Marzipano tiles...';
            progressFill.style.width = '10%';
            
            // Process each scene
            let sceneCount = 0;
            const totalScenes = this.scenes.size;
            
            for (let [sceneId, scene] of this.scenes) {
                if (!scene.imageId) continue;
                
                const imageData = this.images.get(scene.imageId);
                if (!imageData) continue;
                
                progressText.textContent = `Processing scene: ${scene.name}`;
                progressFill.style.width = 20 + (sceneCount / totalScenes) * 60 + '%';
                
                // Create scene folder within tiles directory  
                const tilesFolder = zip.folder('tiles');
                const sceneFolderName = `${sceneCount}-${scene.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const sceneFolder = tilesFolder.folder(sceneFolderName);
                
                // Generate tiles with embedded hotspots
                await this.generateTilesWithHotspots(imageData, scene, sceneFolder);
                
                // Generate preview image for Marzipano
                await this.generatePreviewImage(imageData, scene, sceneFolder);
                
                // Generate metadata file
                const metadata = this.generateSceneMetadata(scene, imageData);
                sceneFolder.file('metadata.json', JSON.stringify(metadata, null, 2));
                
                sceneCount++;
            }
            
            // Add manifest file
            const manifest = this.generateManifest();
            zip.file('manifest.json', JSON.stringify(manifest, null, 2));
            
            // Add README
            const readmeContent = this.generateTiledImageReadme();
            zip.file('README.md', readmeContent);
            
            // Update progress
            progressText.textContent = 'Generating ZIP file...';
            progressFill.style.width = '95%';
            
            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Update progress
            progressText.textContent = 'Download ready!';
            progressFill.style.width = '100%';
            
            // Download ZIP
            const exportName = document.getElementById('exportName').value || 'cube-map-panoramas';
            this.downloadBlob(zipBlob, `${exportName}.zip`);
            
            console.log('📦 Cube map tiles exported successfully');
            
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed: ' + error.message);
        } finally {
            exportBtn.disabled = false;
            setTimeout(() => {
                exportProgress.style.display = 'none';
                progressFill.style.width = '0%';
            }, 2000);
        }
    }

    async generateTilesWithHotspots(imageData, scene, sceneFolder) {
        // Define cube map levels and sizes
        const cubeLevels = [
            { level: 0, faceSize: 512, tileSize: 512 },   // Level 0: 512x512 faces, 1 tile per face
            { level: 1, faceSize: 1024, tileSize: 512 },  // Level 1: 1024x1024 faces, 4 tiles per face  
            { level: 2, faceSize: 2048, tileSize: 512 },  // Level 2: 2048x2048 faces, 16 tiles per face
            { level: 3, faceSize: 4096, tileSize: 512 }   // Level 3: 4096x4096 faces, 64 tiles per face
        ];

        // Cube map face order: 'bdflru' (back, down, front, left, right, up)
        const faceOrder = ['b', 'd', 'f', 'l', 'r', 'u'];

        // Load the original equirectangular image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                try {
                    console.log(`🖼️ Processing equirectangular image: ${img.width}×${img.height}`);
                    
                    // Step 1: Convert equirectangular to cube map faces
                    console.log('🎲 Converting equirectangular to cube map faces...');
                    const baseCubeFaces = await this.equirectangularToCubeMap(img, cubeLevels[0].faceSize);
                    
                    if (!baseCubeFaces || Object.keys(baseCubeFaces).length !== 6) {
                        throw new Error('Failed to generate all 6 cube faces');
                    }
                    
                    console.log(`✅ Generated ${Object.keys(baseCubeFaces).length} cube faces`);
                    
                    // Step 2: Generate multiple resolution levels and tiles
                    for (let levelConfig of cubeLevels) {
                        console.log(`📐 Generating level ${levelConfig.level} cube map tiles (${levelConfig.faceSize}x${levelConfig.faceSize})`);
                        await this.generateCubeMapLevel(baseCubeFaces, scene, levelConfig, sceneFolder, faceOrder);
                    }
                    
                    console.log('✅ All cube map tiles generated successfully');
                    resolve();
                } catch (error) {
                    console.error('❌ Error in cube map tile generation:', error);
                    reject(error);
                }
            };
            img.onerror = (e) => {
                console.error('❌ Failed to load image:', e);
                reject(new Error('Failed to load image'));
            };
            
            console.log(`🔄 Loading image: ${imageData.url}`);
            img.src = imageData.url;
        });
    }

    // Convert equirectangular image to 6 cube faces
    async equirectangularToCubeMap(equirectImage, faceSize) {
        console.log(`🎲 Converting to cube faces (${faceSize}x${faceSize})`);
        
        const faces = {};
        const faceOrder = ['b', 'd', 'f', 'l', 'r', 'u']; // back, down, front, left, right, up
        
        for (let face of faceOrder) {
            console.log(`🖼️ Generating cube face: ${face}`);
            faces[face] = await this.generateCubeFace(equirectImage, face, faceSize);
        }
        
        console.log(`✅ All cube faces generated: ${Object.keys(faces).join(', ')}`);
        return faces;
    }

    // Generate individual cube face from equirectangular image
    async generateCubeFace(equirectImage, face, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const equirectWidth = equirectImage.width;
        const equirectHeight = equirectImage.height;
        
        // Create temporary canvas for equirectangular image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = equirectWidth;
        tempCanvas.height = equirectHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(equirectImage, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, equirectWidth, equirectHeight);
        const outputData = ctx.createImageData(size, size);
        
        // Convert each pixel of the cube face
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Convert cube face coordinates to 3D direction vector
                const direction = this.cubeFaceToDirection(face, x, y, size);
                
                // Convert 3D direction to equirectangular coordinates
                const [equirectX, equirectY] = this.directionToEquirectangular(
                    direction, equirectWidth, equirectHeight
                );
                
                // Sample pixel from equirectangular image (with bilinear interpolation)
                const pixel = this.sampleEquirectangularPixel(imageData, equirectX, equirectY, equirectWidth, equirectHeight);
                
                // Set pixel in output
                const outputIndex = (y * size + x) * 4;
                outputData.data[outputIndex] = pixel[0];     // R
                outputData.data[outputIndex + 1] = pixel[1]; // G
                outputData.data[outputIndex + 2] = pixel[2]; // B
                outputData.data[outputIndex + 3] = 255;      // A
            }
        }
        
        ctx.putImageData(outputData, 0, 0);
        console.log(`✅ Generated cube face ${face}: ${size}x${size}`);
        
        return canvas;
    }

    // Convert cube face coordinates to 3D direction vector
    cubeFaceToDirection(face, x, y, size) {
        // Normalize coordinates to [-1, 1]
        const u = (2 * (x + 0.5) / size) - 1;
        const v = (2 * (y + 0.5) / size) - 1;
        
        // Convert to 3D direction based on face
        switch (face) {
            case 'f': // front: +Z face
                return { x: u, y: -v, z: 1 };
            case 'b': // back: -Z face  
                return { x: -u, y: -v, z: -1 };
            case 'r': // right: +X face
                return { x: 1, y: -v, z: -u };
            case 'l': // left: -X face
                return { x: -1, y: -v, z: u };
            case 'u': // up: +Y face
                return { x: u, y: 1, z: v };
            case 'd': // down: -Y face
                return { x: u, y: -1, z: -v };
            default:
                throw new Error(`Unknown face: ${face}`);
        }
    }

    // Convert 3D direction to equirectangular coordinates
    directionToEquirectangular(direction, width, height) {
        // Convert to spherical coordinates
        const theta = Math.atan2(direction.x, direction.z); // longitude
        const phi = Math.acos(direction.y / Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z)); // latitude
        
        // Convert to equirectangular pixel coordinates
        const equirectX = (theta + Math.PI) / (2 * Math.PI) * width;
        const equirectY = phi / Math.PI * height;
        
        return [equirectX, equirectY];
    }

    // Sample pixel from equirectangular image with bilinear interpolation
    sampleEquirectangularPixel(imageData, x, y, width, height) {
        // Clamp coordinates
        x = Math.max(0, Math.min(width - 1, x));
        y = Math.max(0, Math.min(height - 1, y));
        
        // Get integer coordinates
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);
        
        // Get fractional parts
        const fx = x - x0;
        const fy = y - y0;
        
        // Sample four pixels
        const getPixel = (px, py) => {
            const index = (py * width + px) * 4;
            return [
                imageData.data[index],
                imageData.data[index + 1],
                imageData.data[index + 2]
            ];
        };
        
        const p00 = getPixel(x0, y0);
        const p10 = getPixel(x1, y0);
        const p01 = getPixel(x0, y1);
        const p11 = getPixel(x1, y1);
        
        // Bilinear interpolation
        const result = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            const top = p00[i] * (1 - fx) + p10[i] * fx;
            const bottom = p01[i] * (1 - fx) + p11[i] * fx;
            result[i] = Math.round(top * (1 - fy) + bottom * fy);
        }
        
        return result;
    }

    // Generate cube map level with all faces and tiles
    async generateCubeMapLevel(baseCubeFaces, scene, levelConfig, sceneFolder, faceOrder) {
        const { level, faceSize, tileSize } = levelConfig;
        
        console.log(`📁 Creating level ${level} folder`);
        const levelFolder = sceneFolder.folder(`${level}`);
        
        // Generate tiles for each face
        for (let face of faceOrder) {
            console.log(`🎨 Processing face: ${face} (${faceSize}x${faceSize})`);
            
            // Resize base face to current level size
            const levelFace = await this.resizeCubeFace(baseCubeFaces[face], faceSize);
            
            // Generate tiles for this face
            await this.generateFaceTiles(levelFace, scene, face, level, tileSize, levelFolder);
        }
        
        console.log(`✅ Completed level ${level} with all faces`);
    }

    // Resize cube face to target size
    async resizeCubeFace(originalFace, targetSize) {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        
        // Use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(originalFace, 0, 0, targetSize, targetSize);
        return canvas;
    }

    // Generate tiles for a single cube face
    async generateFaceTiles(faceCanvas, scene, face, level, tileSize, levelFolder) {
        const faceSize = faceCanvas.width;
        const tilesPerRow = Math.ceil(faceSize / tileSize);
        const totalTiles = tilesPerRow * tilesPerRow;
        
        console.log(`📁 Creating face folder: ${face}`);
        const faceFolder = levelFolder.folder(face);
        
        console.log(`📐 Generating ${tilesPerRow}×${tilesPerRow} = ${totalTiles} tiles for face ${face}`);
        
        // Generate tiles row by row with proper folder structure
        for (let y = 0; y < tilesPerRow; y++) {
            console.log(`📁 Creating row folder: ${y}`);
            const rowFolder = faceFolder.folder(`${y}`);
            
            for (let x = 0; x < tilesPerRow; x++) {
                console.log(`🧩 Generating tile (${x},${y}) for face ${face}`);
                
                // Extract tile from face
                const tileCanvas = await this.extractTileFromFace(
                    faceCanvas, x, y, tileSize, scene, level, face
                );
                
                if (!tileCanvas) {
                    console.error(`❌ Failed to generate tile for face ${face} at ${x},${y}`);
                    continue;
                }
                
                // Convert to blob
                const tileBlob = await this.canvasToBlob(tileCanvas);
                
                if (!tileBlob) {
                    console.error(`❌ Failed to convert tile to blob for face ${face} at ${x},${y}`);
                    continue;
                }
                
                // Save tile with coordinate naming: {x}.jpg
                const tileName = `${x}.jpg`;
                console.log(`💿 Saving tile: ${face}/${y}/${tileName} (${tileBlob.size} bytes)`);
                
                rowFolder.file(tileName, tileBlob);
            }
        }
        
        console.log(`✅ Completed face ${face} with ${totalTiles} tiles`);
    }

    // Extract individual tile from face with hotspot embedding
    async extractTileFromFace(faceCanvas, tileX, tileY, tileSize, scene, level, face) {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize;
        const ctx = tileCanvas.getContext('2d');
        
        // Calculate tile position within the face
        const startX = tileX * tileSize;
        const startY = tileY * tileSize;
        
        // Calculate actual tile dimensions (might be smaller at edges)
        const faceSize = faceCanvas.width;
        const actualTileWidth = Math.min(tileSize, faceSize - startX);
        const actualTileHeight = Math.min(tileSize, faceSize - startY);
        
        // Draw the face portion for this tile
        ctx.drawImage(
            faceCanvas,
            startX, startY, actualTileWidth, actualTileHeight,
            0, 0, actualTileWidth, actualTileHeight
        );
        
        // Add hotspots on higher resolution levels (2-3)
        if (level >= 2 && scene.hotspots && scene.hotspots.length > 0) {
            console.log(`🎯 Adding ${scene.hotspots.length} hotspots to tile ${tileX},${tileY} on face ${face}`);
            try {
                this.drawHotspotsOnCubeTile(
                    ctx, scene, tileX * tileSize, tileY * tileSize, tileSize, faceSize, face, level
                );
            } catch (error) {
                console.error(`❌ Error drawing hotspots on tile ${tileX},${tileY} face ${face}:`, error);
                // Continue without hotspots rather than failing completely
            }
        }
        
        return tileCanvas;
    }

    async generateEquirectangularTileWithHotspots(levelCanvas, scene, tileX, tileY, tileSize, level, levelWidth, levelHeight) {
        console.log(`🎨 Creating equirectangular tile canvas ${tileX},${tileY} (${tileSize}×${tileSize})`);
        
        // Create tile canvas
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize;
        const ctx = tileCanvas.getContext('2d');
        
        if (!ctx) {
            console.error(`❌ Failed to get canvas context for tile ${tileX},${tileY}`);
            return null;
        }
        
        // Calculate tile position within the equirectangular image
        const startX = tileX * tileSize;
        const startY = tileY * tileSize;
        
        // Calculate actual tile dimensions (might be smaller at edges)
        const actualTileWidth = Math.min(tileSize, levelWidth - startX);
        const actualTileHeight = Math.min(tileSize, levelHeight - startY);
        
        console.log(`📐 Extracting region: (${startX},${startY}) ${actualTileWidth}×${actualTileHeight}`);
        
        try {
            // Draw the image portion for this tile
            ctx.drawImage(
                levelCanvas,
                startX, startY, actualTileWidth, actualTileHeight, // source rectangle
                0, 0, actualTileWidth, actualTileHeight             // destination rectangle
            );
            
            console.log(`✅ Drew base equirectangular tile ${tileX},${tileY}`);
            
            // Add hotspots on higher resolution levels (2-3)
            if (level >= 2 && scene.hotspots && scene.hotspots.length > 0) {
                console.log(`🎯 Drawing ${scene.hotspots.length} hotspots on equirectangular tile ${tileX},${tileY}`);
                await this.drawHotspotsOnEquirectangularTile(
                    ctx, scene.hotspots, tileX, tileY, tileSize, level, levelWidth, levelHeight
                );
            }
            
            return tileCanvas;
        } catch (error) {
            console.error(`❌ Error generating equirectangular tile ${tileX},${tileY}:`, error);
            return null;
        }
    }



    // Keep the old cube map functions for backward compatibility (they won't be called)
    async equirectToCubeFaces(img) {
        // Convert equirectangular image to 6 cube faces
        const faceSize = Math.floor(Math.min(img.width / 4, img.height / 2));
        console.log(`📏 Cube face size: ${faceSize}×${faceSize}`);
        
        const faces = {};
        
        // Generate each cube face
        for (let faceKey of 'bdflru') {
            console.log(`🎨 Generating cube face: ${faceKey}`);
            
            const canvas = document.createElement('canvas');
            canvas.width = faceSize;
            canvas.height = faceSize;
            const ctx = canvas.getContext('2d');
            
            // Convert equirectangular to this cube face
            await this.convertEquirectFaceToCube(img, ctx, faceKey, faceSize);
            
            faces[faceKey] = canvas;
            console.log(`✅ Generated face ${faceKey}: ${canvas.width}×${canvas.height}`);
        }
        
        return faces;
    }
    
    async convertEquirectFaceToCube(img, ctx, face, size) {
        // Improved equirectangular to cube face conversion
        console.log(`🔄 Converting equirectangular to cube face: ${face}`);
        
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        
        // Better face regions mapping for equirectangular
        const faceRegions = {
            // For equirectangular: longitude maps to X (0-2π), latitude maps to Y (π/2 to -π/2)
            'f': { x: sourceWidth * 0.0, y: sourceHeight * 0.25, w: sourceWidth * 0.25, h: sourceHeight * 0.5 }, // front (0° to 90°)
            'r': { x: sourceWidth * 0.25, y: sourceHeight * 0.25, w: sourceWidth * 0.25, h: sourceHeight * 0.5 }, // right (90° to 180°)
            'b': { x: sourceWidth * 0.5, y: sourceHeight * 0.25, w: sourceWidth * 0.25, h: sourceHeight * 0.5 }, // back (180° to 270°)
            'l': { x: sourceWidth * 0.75, y: sourceHeight * 0.25, w: sourceWidth * 0.25, h: sourceHeight * 0.5 }, // left (270° to 360°)
            'u': { x: sourceWidth * 0.25, y: 0, w: sourceWidth * 0.5, h: sourceHeight * 0.25 }, // up (top half)
            'd': { x: sourceWidth * 0.25, y: sourceHeight * 0.75, w: sourceWidth * 0.5, h: sourceHeight * 0.25 }  // down (bottom half)
        };
        
        const region = faceRegions[face];
        if (region) {
            console.log(`📐 Extracting region for face ${face}: ${region.x},${region.y} ${region.w}×${region.h}`);
            
            // Draw the image region onto the cube face
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(
                img,
                region.x, region.y, region.w, region.h,  // source rectangle
                0, 0, size, size                           // destination rectangle
            );
            
            console.log(`✅ Drew cube face ${face}`);
        } else {
            console.error(`❌ No region defined for face: ${face}`);
        }
    }

    async generateCubeMapLevelTiles(cubeFaces, scene, levelConfig, sceneFolder, faceOrder) {
        const { level, size, tileSize } = levelConfig;
        
        console.log(`📁 Creating level ${level} folder`);
        const levelFolder = sceneFolder.folder(`${level}`);
        
        // Generate tiles for each cube face
        for (let face of faceOrder) {
            console.log(`🎨 Processing face: ${face}`);
            const faceCanvas = cubeFaces[face];
            
            if (!faceCanvas) {
                console.error(`❌ No canvas for face: ${face}`);
                continue;
            }
            
            console.log(`📁 Creating face folder: ${face}`);
            const faceFolder = levelFolder.folder(face);
            
            console.log(`🔄 Resizing face ${face} from ${faceCanvas.width}×${faceCanvas.height} to ${size}×${size}`);
            
            // Resize face to level size
            const resizedFace = document.createElement('canvas');
            resizedFace.width = size;
            resizedFace.height = size;
            const ctx = resizedFace.getContext('2d');
            ctx.drawImage(faceCanvas, 0, 0, size, size);
            
            // Calculate number of tiles per face
            const tilesPerFace = Math.ceil(size / tileSize);
            console.log(`📐 Generating ${tilesPerFace}×${tilesPerFace} tiles for face ${face} (level ${level})`);
            
            // Generate tiles for this face
            for (let x = 0; x < tilesPerFace; x++) {
                for (let y = 0; y < tilesPerFace; y++) {
                    console.log(`🧩 Generating tile ${x},${y} for face ${face}`);
                    
                    const tileCanvas = await this.generateCubeTileWithHotspots(
                        resizedFace, scene, x, y, tileSize, level, face
                    );
                    
                    if (!tileCanvas) {
                        console.error(`❌ Failed to generate tile canvas for ${face} ${x},${y}`);
                        continue;
                    }
                    
                    console.log(`🔄 Converting tile to blob: ${tileCanvas.width}×${tileCanvas.height}`);
                    
                    // Convert tile to blob
                    const tileBlob = await this.canvasToBlob(tileCanvas);
                    
                    if (!tileBlob) {
                        console.error(`❌ Failed to convert tile to blob for ${face} ${x},${y}`);
                        continue;
                    }
                    
                    console.log(`💾 Blob created: ${tileBlob.size} bytes`);
                    
                    // Calculate tile index for Marzipano: index = y * tilesPerFace + x
                    const tileIndex = y * tilesPerFace + x;
                    
                    // Save with Marzipano naming: tile index with .jpg extension
                    const tileName = `${tileIndex}.jpg`;
                    console.log(`💿 Saving tile: ${tileName} (${tileBlob.size} bytes)`);
                    
                    faceFolder.file(tileName, tileBlob);
                }
            }
            
            console.log(`✅ Completed face ${face} with ${tilesPerFace * tilesPerFace} tiles`);
        }
    }

    async generateCubeTileWithHotspots(faceCanvas, scene, tileX, tileY, tileSize, level, face) {
        console.log(`🎨 Creating tile canvas ${tileX},${tileY} for face ${face} (${tileSize}×${tileSize})`);
        
        // Create tile canvas
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize;
        const ctx = tileCanvas.getContext('2d');
        
        if (!ctx) {
            console.error(`❌ Failed to get canvas context for tile ${tileX},${tileY}`);
            return null;
        }
        
        // Calculate tile position within the face
        const startX = tileX * tileSize;
        const startY = tileY * tileSize;
        
        console.log(`📐 Extracting tile from face at ${startX},${startY} (${tileSize}×${tileSize})`);
        
        // Draw image tile from the cube face
        try {
            ctx.drawImage(faceCanvas, startX, startY, tileSize, tileSize, 0, 0, tileSize, tileSize);
            console.log(`✅ Drew base tile image`);
        } catch (error) {
            console.error(`❌ Failed to draw base tile:`, error);
            return null;
        }
        
        // Draw hotspots that fall within this cube face tile
        try {
            this.drawHotspotsOnCubeTile(ctx, scene, startX, startY, tileSize, faceCanvas.width, face, level);
            console.log(`✅ Drew hotspots on tile`);
        } catch (error) {
            console.error(`❌ Failed to draw hotspots:`, error);
            // Continue without hotspots rather than failing completely
        }
        
        return tileCanvas;
    }

    drawHotspotsOnCubeTile(ctx, scene, tileStartX, tileStartY, tileSize, faceSize, face, level) {
        // Only draw hotspots on higher resolution levels for clarity
        if (level < 2) return;
        
        scene.hotspots.forEach(hotspot => {
            try {
                // Convert spherical coordinates to cube face coordinates
                const faceCoords = this.sphericalToCubeFace(hotspot.coords, faceSize);
                
                if (!faceCoords || faceCoords.face !== face) return; // Hotspot not on this face
                
                // Check if hotspot falls within this tile
                if (faceCoords.x >= tileStartX && faceCoords.x < tileStartX + tileSize &&
                    faceCoords.y >= tileStartY && faceCoords.y < tileStartY + tileSize) {
                    
                    // Draw hotspot overlay
                    const localX = faceCoords.x - tileStartX;
                    const localY = faceCoords.y - tileStartY;
                    
                    console.log(`🎯 Drawing hotspot "${hotspot.text || 'Hotspot'}" at (${localX}, ${localY}) on face ${face}`);
                    this.drawHotspotMarker(ctx, localX, localY, hotspot, level);
                }
            } catch (error) {
                console.error(`❌ Error processing hotspot "${hotspot.text || 'unknown'}":`, error);
                // Continue with next hotspot
            }
        });
    }

    sphericalToCubeFace(coords, faceSize) {
        // Convert spherical coordinates to cube face coordinates
        // Convert degrees to radians
        const yawRad = (coords.yaw || 0) * Math.PI / 180;
        const pitchRad = (coords.pitch || 0) * Math.PI / 180;
        
        // Convert to 3D direction vector
        const x = Math.cos(pitchRad) * Math.sin(yawRad);
        const y = Math.sin(pitchRad);
        const z = Math.cos(pitchRad) * Math.cos(yawRad);
        
        // Determine which face has the largest absolute component
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);
        
        let face, u, v;
        
        if (absX >= absY && absX >= absZ) {
            // X face
            if (x > 0) {
                face = 'r'; // right
                u = -z / x;
                v = -y / x;
            } else {
                face = 'l'; // left
                u = z / -x;
                v = -y / -x;
            }
        } else if (absY >= absX && absY >= absZ) {
            // Y face
            if (y > 0) {
                face = 'u'; // up
                u = x / y;
                v = z / y;
            } else {
                face = 'd'; // down
                u = x / -y;
                v = -z / -y;
            }
        } else {
            // Z face
            if (z > 0) {
                face = 'f'; // front
                u = x / z;
                v = -y / z;
            } else {
                face = 'b'; // back
                u = -x / -z;
                v = -y / -z;
            }
        }
        
        // Convert from [-1, 1] to pixel coordinates
        const pixelX = Math.round((u + 1) * faceSize / 2);
        const pixelY = Math.round((v + 1) * faceSize / 2);
        
        return {
            face: face,
            x: Math.max(0, Math.min(faceSize - 1, pixelX)),
            y: Math.max(0, Math.min(faceSize - 1, pixelY))
        };
    }

    drawHotspotMarker(ctx, x, y, hotspot, level) {
        // Scale marker size based on level
        const markerSize = Math.max(8, level * 4);
        const textSize = Math.max(10, level * 2);
        
        // Draw hotspot circle
        ctx.save();
        ctx.fillStyle = hotspot.type === 'link' ? '#007bff' : '#28a745';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(x, y, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw hotspot icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${textSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hotspot.type === 'link' ? '🔗' : 'ℹ️', x, y);
        
        // Draw label on higher levels
        if (level >= 3 && hotspot.title) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x - 40, y + markerSize + 5, 80, 20);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = `${textSize - 2}px Arial`;
            ctx.fillText(hotspot.title.substring(0, 12), x, y + markerSize + 15);
        }
        
        ctx.restore();
    }

    async generatePreviewImage(imageData, scene, sceneFolder) {
        // Generate a cube map preview strip for Marzipano library integration
        const faceSize = 1024;
        const previewWidth = faceSize;
        const previewHeight = faceSize * 6; // 6 faces vertically in 'bdflru' order
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = async () => {
                try {
                    console.log('🖼️ Generating cube map preview strip...');
                    
                    // Convert to cube faces first
                    const cubeFaces = await this.equirectangularToCubeMap(img, faceSize);
                    
                    if (!cubeFaces || Object.keys(cubeFaces).length !== 6) {
                        throw new Error('Failed to generate cube faces for preview');
                    }
                    
                    // Create preview canvas (6 faces vertically)
                    const previewCanvas = document.createElement('canvas');
                    previewCanvas.width = previewWidth;
                    previewCanvas.height = previewHeight;
                    const ctx = previewCanvas.getContext('2d');
                    
                    // Draw each face in 'bdflru' order vertically
                    const faceOrder = ['b', 'd', 'f', 'l', 'r', 'u'];
                    for (let i = 0; i < faceOrder.length; i++) {
                        const face = faceOrder[i];
                        const faceCanvas = cubeFaces[face];
                        
                        if (faceCanvas) {
                            console.log(`🎨 Adding face ${face} to preview strip at position ${i}`);
                            // Draw face at vertical position i
                            ctx.drawImage(faceCanvas, 0, i * faceSize, faceSize, faceSize);
                        }
                    }
                    
                    // Convert to blob
                    const previewBlob = await this.canvasToBlob(previewCanvas);
                    
                    // Save preview image in scene folder
                    sceneFolder.file('preview.jpg', previewBlob);
                    
                    console.log(`✅ Generated cube map preview strip: ${previewWidth}×${previewHeight}`);
                    resolve();
                } catch (error) {
                    console.error('❌ Error generating cube map preview:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for preview'));
            img.src = imageData.url;
        });
    }

    async canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            console.log(`🔄 Converting canvas to blob: ${canvas.width}×${canvas.height}`);
            
            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log(`✅ Canvas converted to blob: ${blob.size} bytes (${blob.type})`);
                        resolve(blob);
                    } else {
                        console.error(`❌ Failed to convert canvas to blob`);
                        reject(new Error('Canvas toBlob returned null'));
                    }
                }, 'image/jpeg', 0.85);
            } catch (error) {
                console.error(`❌ Error during canvas toBlob:`, error);
                reject(error);
            }
        });
    }

    generateSceneMetadata(scene, imageData) {
        return {
            id: scene.id,
            name: scene.name,
            originalImage: {
                name: imageData.name,
                width: imageData.width,
                height: imageData.height,
                aspectRatio: imageData.aspectRatio
            },
            initialView: scene.initialView,
            hotspots: scene.hotspots.map(hotspot => ({
                id: hotspot.id,
                title: hotspot.title,
                type: hotspot.type,
                coordinates: hotspot.coords,
                target: hotspot.target,
                text: hotspot.text
            })),
            tileStructure: {
                type: "cubemap",
                projection: "cube",
                faceOrder: "bdflru",
                levels: [
                    { level: 0, faceSize: 512, tileSize: 512, tilesPerFace: 1, totalTilesPerFace: 1, totalTiles: 6 },
                    { level: 1, faceSize: 1024, tileSize: 512, tilesPerFace: 4, totalTilesPerFace: 4, totalTiles: 24 },
                    { level: 2, faceSize: 2048, tileSize: 512, tilesPerFace: 16, totalTilesPerFace: 16, totalTiles: 96 },
                    { level: 3, faceSize: 4096, tileSize: 512, tilesPerFace: 64, totalTilesPerFace: 64, totalTiles: 384 }
                ],
                faces: ["b", "d", "f", "l", "r", "u"],
                preview: {
                    filename: "preview.jpg",
                    width: 1024,
                    height: 6144,
                    description: "Cube map preview strip for Marzipano library integration (6 faces vertically in 'bdflru' order)"
                }
            },
            exportDate: new Date().toISOString()
        };
    }

    generateManifest() {
        const scenes = [];
        this.scenes.forEach((scene, id) => {
            if (scene.imageId) {
                scenes.push({
                    id: id,
                    name: scene.name,
                    folder: `scene_${id}`,
                    hotspotCount: scene.hotspots.length
                });
            }
        });

        return {
            exportType: 'tiled-panoramas-with-hotspots',
            version: '1.0',
            exportTool: 'Marzipano Export Tool',
            exportDate: new Date().toISOString(),
            settings: this.settings,
            scenes: scenes,
            tileFormat: {
                type: 'cubemap',
                projection: 'cube',
                faceOrder: 'bdflru',
                levels: 4,
                tileSize: 512,
                imageFormat: 'jpeg',
                quality: 0.85,
                preview: {
                    width: 1024,
                    height: 6144,
                    filename: 'preview.jpg',
                    description: 'Vertical cube map strip (6 faces in bdflru order)'
                }
            },
            hotspotEmbedding: {
                embedded: true,
                visibleOnLevels: [2, 3],
                markerStyle: 'circle-with-icon'
            }
        };
    }

    generateTiledImageReadme() {
        return `# Cube Map Tiled Panoramas with Embedded Hotspots

## 📁 Export Structure

This export contains panoramic images converted to Marzipano-compatible cube map tiles with hotspots embedded directly into the image files.

\`\`\`
cube-map-panoramas/
├── manifest.json                    # Export metadata and structure  
├── tiles/                          # Marzipano tiles directory
│   └── {scene_id}/                 # Scene folder (e.g., "0-lobby_cam_view01")
│       ├── metadata.json           # Scene-specific metadata
│       ├── preview.jpg             # 1024×6144 cube map strip (6 faces)
│       ├── 0/                     # Level 0 (512×512 per face)
│       │   ├── b/                 # Back face folder
│       │   │   └── 0/             # Row folder (y=0)
│       │   │       └── 0.jpg      # Column file (x=0)
│       │   ├── d/                 # Down face folder  
│       │   │   └── 0/             # Row folder (y=0)
│       │   │       └── 0.jpg      # Column file (x=0)
│       │   ├── f/                 # Front face folder
│       │   │   └── 0/             # Row folder (y=0)
│       │   │       └── 0.jpg      # Column file (x=0)
│       │   ├── l/                 # Left face folder
│       │   │   └── 0/             # Row folder (y=0)
│       │   │       └── 0.jpg      # Column file (x=0)
│       │   ├── r/                 # Right face folder
│       │   │   └── 0/             # Row folder (y=0)
│       │   │       └── 0.jpg      # Column file (x=0)
│       │   └── u/                 # Up face folder
│       │       └── 0/             # Row folder (y=0)
│       │           └── 0.jpg      # Column file (x=0)
│       ├── 1/                     # Level 1 (1024×1024 per face)
│       │   ├── b/                 # Back face with 2×2 tiles
│       │   │   ├── 0/             # Row 0 folder
│       │   │   │   ├── 0.jpg      # (x=0, y=0)
│       │   │   │   └── 1.jpg      # (x=1, y=0)
│       │   │   └── 1/             # Row 1 folder
│       │   │       ├── 0.jpg      # (x=0, y=1)
│       │   │       └── 1.jpg      # (x=1, y=1)
│       │   └── [d,f,l,r,u]/       # Other faces with same 2×2 structure
│       ├── 2/                     # Level 2 (2048×2048 + hotspots)
│       │   └── [faces]/           # Each face with 4×4 tiles in row/col folders
│       │       └── [0-3]/         # Row folders (y=0 to y=3)
│       │           └── [0-3].jpg  # Column files (x=0 to x=3)
│       └── 3/                     # Level 3 (4096×4096 + labels)  
│           └── [faces]/           # Each face with 8×8 tiles in row/col folders
│               └── [0-7]/         # Row folders (y=0 to y=7)
│                   └── [0-7].jpg  # Column files (x=0 to x=7)
└── README.md                       # This file
\`\`\`

## 🧊 Cube Map Structure

- **Projection**: Cube Map (6 faces: back, down, front, left, right, up)
- **Face Order**: 'bdflru' (Marzipano standard)
- **Preview**: Vertical cube map strip (1024×6144)
- **Tile Format**: tiles/{scene_id}/{level}/{face}/{y}/{x}.jpg
- **Tile Naming**: Row/column coordinates with .jpg extension (0.jpg, 1.jpg for x coordinates)

## 🎯 Hotspot Embedding

- **Embedded**: Hotspots are drawn directly onto cube face tiles
- **Levels**: Visible on levels 2-3 (higher resolution)  
- **Face Detection**: Hotspots automatically mapped to correct cube faces
- **Markers**: Colored circles with icons
- **Labels**: Scene names on level 3 tiles
- **Colors**: 
  - 🔵 Blue = Link hotspots  
  - 🟢 Green = Info hotspots

## 📊 Cube Map Tile Structure

- **Level 0**: 1×1 tiles per face (512×512px) - Preview level
- **Level 1**: 2×2 tiles per face (512×512px each) - Low detail
- **Level 2**: 4×4 tiles per face (512×512px each) - Medium detail + hotspots
- **Level 3**: 8×8 tiles per face (512×512px each) - Full detail + labels
- **Total Faces**: 6 (back, down, front, left, right, up)

## 📋 Metadata Files

### manifest.json
Contains overall export information:
- Export date and tool version
- List of all scenes
- Tile format specifications
- Hotspot embedding settings

### [scene]/metadata.json  
Contains scene-specific information:
- Original image dimensions
- Hotspot coordinates and data
- Initial view parameters
- Tile structure details

## 🔧 Usage Examples

### Integration with Marzipano Library
\`\`\`javascript
// Load scene metadata
const sceneData = await fetch('scene_[id]/metadata.json').then(r => r.json());

// Create cube map image source with preview and tiles
const source = new Marzipano.ImageUrlSource((tile) => {
    if (tile == null) {
        // Return cube map preview strip for fallback/loading
        return { 
            url: 'tiles/{scene_id}/preview.jpg',
            rect: null // Marzipano handles cube map preview strip extraction
        };
    }
    // Return cube map tile URL: tiles/{scene_id}/{level}/{face}/{y}/{x}.jpg
    const face = tile.face;
    const level = tile.z;
    const x = tile.x;
    const y = tile.y;
    return { url: \`tiles/{scene_id}/\${level}/\${face}/\${y}/\${x}.jpg\` };
});

// Alternative: Use custom tile URL builder (fromString doesn't support {y}/{x} pattern)
const source2 = new Marzipano.ImageUrlSource((tile) => {
    if (tile == null) {
        return { 
            url: 'tiles/{scene_id}/preview.jpg',
            rect: null 
        };
    }
    return { url: \`tiles/{scene_id}/\${tile.z}/\${tile.face}/\${tile.y}/\${tile.x}.jpg\` };
});

// Create cube geometry with tile structure from metadata
const levels = sceneData.tileStructure.levels.map(level => ({
    tileSize: level.tileSize,
    size: level.faceSize
}));
const geometry = new Marzipano.CubeGeometry(levels);

// Create scene
const scene = viewer.createScene({
    source: source,
    geometry: geometry,
    view: view
});
\`\`\`

### Load in Custom Applications
\`\`\`javascript
// Read manifest
const manifest = await fetch('manifest.json').then(r => r.json());

// Load scene metadata  
const sceneData = await fetch('tiles/{scene_id}/metadata.json').then(r => r.json());

// Build cube map tile URL pattern
const tileUrl = (level, face, y, x) => \`tiles/{scene_id}/\${level}/\${face}/\${y}/\${x}.jpg\`;

// Get cube map preview strip
const previewUrl = 'tiles/{scene_id}/preview.jpg';
\`\`\`

### Extract Hotspot Data
\`\`\`javascript
// Hotspots are embedded in images but also available in metadata
const hotspots = sceneData.hotspots;
hotspots.forEach(hotspot => {
    console.log(\`\${hotspot.title}: \${hotspot.coordinates.yaw}, \${hotspot.coordinates.pitch}\`);
});
\`\`\`

## 🎮 Supported Formats

- **Images**: JPEG (85% quality)
- **Coordinates**: Spherical (yaw/pitch in radians)  
- **Projection**: Equirectangular
- **Aspect Ratio**: 2:1 (width:height)

---

Generated by Marzipano Export Tool
Export Date: ${new Date().toISOString()}`;
    }

    // Removed old generateTourData() - no longer needed for tiled image export

    // Removed generateMainHtml() - no longer needed for tiled image export

    // Removed generateTourCss() - no longer needed for tiled image export

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showExportInstructions(tourName) {
        const modal = document.createElement('div');
        modal.className = 'export-instructions-modal';
        modal.innerHTML = `
            <div class="export-instructions-backdrop">
                <div class="export-instructions-container">
                    <div class="export-instructions-header">
                        <h3>🎉 Tour Exported Successfully!</h3>
                        <button class="close-instructions">&times;</button>
                    </div>
                    <div class="export-instructions-content">
                        <div class="instruction-step">
                            <h4>📁 Step 1: Extract the ZIP File</h4>
                            <p>Extract <strong>${tourName}.zip</strong> to a folder on your computer.</p>
                        </div>
                        
                        <div class="instruction-step">
                            <h4>🚨 Important: Don't Double-Click index.html</h4>
                            <p class="warning">Opening index.html directly will cause CORS errors. You need a local server!</p>
                        </div>
                        
                        <div class="instruction-step">
                            <h4>🔧 Step 2: Start a Local Server</h4>
                            <p>Navigate to the extracted folder in terminal/command prompt:</p>
                            <div class="code-block">
                                <div class="code-tab">Windows (PowerShell/CMD)</div>
                                <code>cd "path/to/extracted/folder"<br>python -m http.server 8080</code>
                            </div>
                            <div class="code-block">
                                <div class="code-tab">Alternative (Node.js)</div>
                                <code>npx http-server -p 8080</code>
                            </div>
                        </div>
                        
                        <div class="instruction-step">
                            <h4>🌐 Step 3: Open in Browser</h4>
                            <p>Open your browser and go to: <strong>http://localhost:8080</strong></p>
                        </div>
                        
                        <div class="instruction-step">
                            <h4>🚀 Step 4: Deploy Online (Optional)</h4>
                            <p>Upload the extracted folder to any web hosting service:</p>
                            <ul>
                                <li>GitHub Pages</li>
                                <li>Netlify</li>
                                <li>Vercel</li>
                                <li>Your web server</li>
                            </ul>
                        </div>
                    </div>
                    <div class="export-instructions-footer">
                        <button class="btn btn-primary close-instructions">Got it!</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(modal);
        
        // Add close handlers
        const closeBtns = modal.querySelectorAll('.close-instructions');
        const backdrop = modal.querySelector('.export-instructions-backdrop');
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    generateReadme(tourName) {
        return `# ${tourName}

## 🌐 Virtual Tour

This is a virtual tour created with Marzipano Export Tool.

## ⚠️ IMPORTANT: Setup Required

**DO NOT** double-click \`index.html\` directly! This will cause CORS errors.

### 🔧 How to Run the Tour

#### Option 1: Local HTTP Server (Recommended)

1. Open terminal/command prompt in this folder
2. Run one of these commands:

\`\`\`bash
# Using Python 3
python -m http.server 8080

# Using Python 2  
python -m SimpleHTTPServer 8080

# Using Node.js
npx http-server -p 8080

# Using PHP
php -S localhost:8080
\`\`\`

3. Open browser and go to: **http://localhost:8080**

#### Option 2: Upload to Web Server

Upload this entire folder to any web hosting service:
- GitHub Pages
- Netlify  
- Vercel
- Your web server

### 📁 What's Included

- \`index.html\` - Main tour file
- \`style.css\` - Tour styling
- \`data.js\` - Tour configuration  
- \`media/\` - Tour images
- \`SETUP.html\` - Visual setup guide

### 🚨 Troubleshooting

If you see errors like "Access blocked by CORS policy":
1. Make sure you're running a local server (see above)
2. Don't open the HTML file directly from file explorer

### 🎮 Controls

- **Mouse/Touch**: Drag to look around
- **Mouse Wheel**: Zoom in/out
- **Click Hotspots**: Navigate between scenes or view information
- **Fullscreen**: Click the fullscreen button

---

Created with [Marzipano Export Tool](https://github.com/google/marzipano)`;
    }

    generateSetupInstructions() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Virtual Tour Setup Instructions</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 2rem;
        }
        .step {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
            border-left: 4px solid #007bff;
        }
        .warning {
            background: #fff5f5;
            border-left-color: #dc3545;
            color: #721c24;
        }
        .code {
            background: #2d3748;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 6px;
            font-family: Monaco, monospace;
            margin: 1rem 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 1rem 0;
        }
        .btn:hover {
            background: #218838;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌐 Virtual Tour Setup</h1>
        <p>Follow these steps to view your virtual tour</p>
    </div>

    <div class="step warning">
        <h3>🚨 Important: CORS Error Prevention</h3>
        <p><strong>DO NOT double-click index.html!</strong> This will cause "CORS policy" errors.</p>
        <p>You need to run a local server to view the tour properly.</p>
    </div>

    <div class="step">
        <h3>🔧 Step 1: Open Terminal/Command Prompt</h3>
        <p><strong>Windows:</strong> Press Win+R, type "cmd", press Enter</p>
        <p><strong>Mac:</strong> Press Cmd+Space, type "terminal", press Enter</p>
        <p><strong>Linux:</strong> Press Ctrl+Alt+T</p>
    </div>

    <div class="step">
        <h3>📁 Step 2: Navigate to Tour Folder</h3>
        <p>Type this command (replace with your actual path):</p>
        <div class="code">cd "path/to/your/tour/folder"</div>
    </div>

    <div class="step">
        <h3>🚀 Step 3: Start Local Server</h3>
        <p>Choose one of these commands:</p>
        
        <h4>Python (most common):</h4>
        <div class="code">python -m http.server 8080</div>
        
        <h4>Node.js:</h4>
        <div class="code">npx http-server -p 8080</div>
        
        <h4>PHP:</h4>
        <div class="code">php -S localhost:8080</div>
    </div>

    <div class="step">
        <h3>🌐 Step 4: Open in Browser</h3>
        <p>Open your web browser and go to:</p>
        <div class="code">http://localhost:8080</div>
        <p>Your virtual tour should now load without errors!</p>
    </div>

    <div class="step">
        <h3>🌍 Alternative: Deploy Online</h3>
        <p>Upload this folder to any web hosting service:</p>
        <ul>
            <li><strong>GitHub Pages:</strong> Free hosting for static sites</li>
            <li><strong>Netlify:</strong> Drag & drop deployment</li>
            <li><strong>Vercel:</strong> Fast global CDN</li>
            <li><strong>Your web server:</strong> Upload via FTP/cPanel</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 3rem 0;">
        <a href="index.html" class="btn">🎯 Launch Virtual Tour</a>
    </div>

    <div class="step">
        <h3>❓ Still Having Issues?</h3>
        <p>Common problems and solutions:</p>
        <ul>
            <li><strong>"CORS policy" error:</strong> Make sure you're using a local server, not opening the file directly</li>
            <li><strong>"Python not found":</strong> Install Python from python.org</li>
            <li><strong>"npx not found":</strong> Install Node.js from nodejs.org</li>
            <li><strong>Port 8080 in use:</strong> Try a different port like 8081 or 3000</li>
        </ul>
    </div>

    <script>
        // Check if running from local server
        if (location.protocol === 'file:') {
            const warning = document.createElement('div');
            warning.style.cssText = \`
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #dc3545;
                color: white;
                padding: 1rem;
                text-align: center;
                font-weight: bold;
                z-index: 9999;
            \`;
            warning.innerHTML = '⚠️ You are viewing this from file:// - Please follow the setup instructions below!';
            document.body.prepend(warning);
        }
    </script>
</body>
</html>`;
    }

    // Image Preview
    showImagePreview(imageId) {
        const imageData = this.images.get(imageId);
        if (!imageData) return;
        
        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'image-preview-modal';
        modal.innerHTML = `
            <div class="image-preview-backdrop">
                <div class="image-preview-container">
                    <div class="image-preview-header">
                        <h3>${imageData.name}</h3>
                        <button class="close-preview">&times;</button>
                    </div>
                    <div class="image-preview-content">
                        <img src="${imageData.url}" alt="${imageData.name}" class="preview-image">
                    </div>
                    <div class="image-preview-info">
                        <p>Dimensions: ${imageData.width} × ${imageData.height}</p>
                        <p>Size: ${(imageData.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p>Aspect Ratio: ${imageData.aspectRatio.toFixed(2)}:1</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(modal);
        
        // Add close handlers
        const closeBtn = modal.querySelector('.close-preview');
        const backdrop = modal.querySelector('.image-preview-backdrop');
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // Utility Methods
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    updateStats() {
        document.getElementById('statsScenes').textContent = this.scenes.size;
        document.getElementById('statsImages').textContent = this.images.size;
        
        let totalHotspots = 0;
        this.scenes.forEach(scene => {
            totalHotspots += scene.hotspots.length;
        });
        document.getElementById('statsHotspots').textContent = totalHotspots;
    }
}

// Initialize the tool when page loads
let tool;
document.addEventListener('DOMContentLoaded', () => {
    tool = new MarzipanoExportTool();
});
