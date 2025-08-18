import { InferenceClient } from "@huggingface/inference";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
export async function createDrawingCanvas(clientID, inputPrompt) {
    const client = new InferenceClient(clientID.toString());
    const image = await client.textToImage({
        provider: "fal-ai",
        model: "Qwen/Qwen-Image",
        inputs: inputPrompt,
        parameters: { num_inference_steps: 5 },
    });
    let imageDataURL;
    imageDataURL = image.startsWith('') ? image : `data:image/png;base64,${image}`;
    const htmlContent = generateHTMLCanvas(imageDataURL, inputPrompt);
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const htmlPath = path.join(tempDir, `drawing_canvas_${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    const command = getOpenCommand(htmlPath); // this opens the HTML file in the default browser
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Error opening HTML File: ", error);
                reject(`Failed to open drawing canvas: ${error.message}`);
            }
            else {
                console.log("HTML File opened");
                resolve(`Drawing canvas opened successfully at ${htmlPath} with ${inputPrompt}`);
            }
        });
    });
}
;
function getOpenCommand(filepath) {
    const platform = process.platform;
    switch (platform) {
        case "win32":
            return `start "" "${filepath}"`;
        case "darwin":
            return `open "${filepath}"`;
        case "linux":
            return `xdg-open "${filepath}"`;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
function generateHTMLCanvas(backgroundImage, prompt) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Drawing Canvas - ${prompt}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #f0f0f0;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .toolbar {
            display: flex;
            gap: 15px;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .toolbar button {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .toolbar button:hover {
            background: #e9ecef;
            transform: translateY(-1px);
        }
        .toolbar button.active {
            background: #007bff;
            color: white;
        }

        .color-picker, .size-slider {
            margin: 0 10px;
        }

        .canvas-container {
            text-align: center;
            border: 3px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            display: inline-block;
        }

        #drawingCanvas {
            background-image: url('${backgroundImage}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            cursor: crosshair;
        }

        .export-section {
            margin-top: 20px;
            text-align: center;
        }
        .export-section button {
            padding: 12px 24px;
            margin: 0 10px;
            border: none;
            border-radius: 6px;
            background: #28a745;
            color: white;
            cursor: pointer;
            font-size: 16px;
        }

        .export-section button:hover {
            background: #218838;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 AI Drawing Canvas</h1>
            <p><strong>Prompt:</strong> "${prompt}"</p>
        </div>

        <div class="toolbar">
            <button id="drawBtn" class="active">✏️ Draw</button>
            <button id="eraseBtn">🧽 Erase</button>
            
            <div class="color-picker">
                <label>Color: </label>
                <input type="color" id="colorPicker" value="#000000">
            </div>
            
            <div class="size-slider">
                <label>Size: </label>
                <input type="range" id="sizeSlider" min="1" max="20" value="3">
                <span id="sizeDisplay">3px</span>
            </div>
            
            <button id="undoBtn">↶ Undo</button>
            <button id="redoBtn">↷ Redo</button>
            <button id="clearBtn">🗑️ Clear</button>
        </div>

        <div class="canvas-container">
            <canvas id="drawingCanvas" width="800" height="600"></canvas>
        </div>

        <div class="export-section">
            <button id="downloadBtn">💾 Download Drawing</button>
            <button id="saveBtn">📁 Save as PNG</button>
        </div>
    </div>

    <script>
    class DrawingCanvas {
        constructor() {
            this.canvas = document.getElementById('drawingCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.isDrawing = false;
            this.isErasing = false;
            this.currentPath = [];
            this.allPaths = [];
            this.undoStack = [];
            this.redoStack = [];
            
            this.setupEventListeners();
            this.setupCanvas();
        }

        setupCanvas() {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.saveState();
        }

        setupEventListeners() {
            // Drawing events
            this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
            this.canvas.addEventListener('mousemove', this.draw.bind(this));
            this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
            this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
            this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
                this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
                this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

                // Toolbar events
                document.getElementById('drawBtn').addEventListener('click', () => this.setMode('draw'));
                document.getElementById('eraseBtn').addEventListener('click', () => this.setMode('erase'));
                document.getElementById('colorPicker').addEventListener('change', this.updateColor.bind(this));
                document.getElementById('sizeSlider').addEventListener('input', this.updateSize.bind(this));
                document.getElementById('undoBtn').addEventListener('click', this.undo.bind(this));
                document.getElementById('redoBtn').addEventListener('click', this.redo.bind(this));
                document.getElementById('clearBtn').addEventListener('click', this.clear.bind(this));
                document.getElementById('downloadBtn').addEventListener('click', this.download.bind(this));
                document.getElementById('saveBtn').addEventListener('click', this.save.bind(this));
            }

            getMousePos(e) {
                const rect = this.canvas.getBoundingClientRect();
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }

            handleTouch(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent(e.type.replace('touch', 'mouse'), {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }

            startDrawing(e) {
                this.isDrawing = true;
                const pos = this.getMousePos(e);
                this.currentPath = [pos];
                
                this.ctx.beginPath();
                this.ctx.moveTo(pos.x, pos.y);
            }

            draw(e) {
                if (!this.isDrawing) return;
                
                const pos = this.getMousePos(e);
                this.currentPath.push(pos);
                
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            }
            stopDrawing() {
                if (!this.isDrawing) return;
                
                this.isDrawing = false;
                this.saveState();
                this.redoStack = [];
            }

            setMode(mode) {
                this.isErasing = mode === 'erase';
                this.ctx.globalCompositeOperation = this.isErasing ? 'destination-out' : 'source-over';
                
                document.getElementById('drawBtn').classList.toggle('active', mode === 'draw');
                document.getElementById('eraseBtn').classList.toggle('active', mode === 'erase');
                
                this.canvas.style.cursor = this.isErasing ? 'grab' : 'crosshair';
            }

            updateColor(e) {
                this.ctx.strokeStyle = e.target.value;
            }

            updateSize(e) {
                this.ctx.lineWidth = e.target.value;
                document.getElementById('sizeDisplay').textContent = e.target.value + 'px';
            }
            saveState() {
                this.undoStack.push(this.canvas.toDataURL());
                if (this.undoStack.length > 20) {
                    this.undoStack.shift();
                }
            }

            undo() {
                if (this.undoStack.length > 1) {
                    this.redoStack.push(this.undoStack.pop());
                    this.restoreState(this.undoStack[this.undoStack.length - 1]);
                }
            }

            redo() {
                if (this.redoStack.length > 0) {
                    const state = this.redoStack.pop();
                    this.undoStack.push(state);
                    this.restoreState(state);
                }
            }

            restoreState(dataURL) {
                const img = new Image();
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0);
                };
                img.src = dataURL;
            }
            clear() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.saveState();
                this.redoStack = [];
            }

            download() {
                const link = document.createElement('a');
                link.download = 'ai-drawing-' + new Date().getTime() + '.png';
                link.href = this.canvas.toDataURL();
                link.click();
            }

            save() {
                this.download();
            }
        }

        // Initialize the drawing canvas when page loads
        window.addEventListener('load', () => {
            new DrawingCanvas();
            console.log('Drawing canvas initialized successfully!');
        });
    </script>
</body>
</html>`;
}
