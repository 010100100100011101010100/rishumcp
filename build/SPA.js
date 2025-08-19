import path from 'path';
import process from 'process';
import fs from 'fs';
import { exec } from 'child_process';
export async function SPA(code) {
    const cwd = process.cwd();
    const filePath = path.join(cwd, 'code', `${Date.now()}.html`);
    const fileContent = code;
    fs.writeFileSync(filePath, fileContent, 'utf8');
    const command = getOpenCommand();
    return new Promise((resolve, reject) => {
        exec(`${command} "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(`Error opening file: ${error.message}`);
            }
            else if (stderr) {
                reject(`Error: ${stderr}`);
            }
            else {
                resolve(`File opened successfully: ${filePath}`);
            }
        });
    });
}
function getOpenCommand() {
    const platform = process.platform;
    switch (platform) {
        case 'darwin':
            return `open`;
        case 'win32':
            return `start`;
        case 'linux':
            return `xdg-open`;
        default:
            throw new Error('Unsupported platform');
    }
}
