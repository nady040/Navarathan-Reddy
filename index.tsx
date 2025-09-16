/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, Modality} from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const imageEditModel = 'gemini-2.5-flash-image-preview';
const visionModel = 'gemini-2.5-flash';

// Array of different poses for two characters
const poses = [
  'shaking hands',
  'standing back-to-back, ready for a fight',
  'clashing swords in a dramatic duel',
  'character 1 teaching character 2 a fighting stance',
  'character 1 comforting a sad character 2',
  'laughing together at a shared joke',
  'exploring a mysterious cave, one holding a torch',
  'working together to build a campfire',
  'in a tense standoff, staring each other down',
  'celebrating a victory with a high-five',
];

// Array of different expressions
const expressions = [
  'a neutral expression',
  'a slight smile',
  'a joyful grin',
  'a determined grit',
  'an angry scowl',
  'a surprised look',
  'a sad frown',
  'a thoughtful and pensive look',
  'a mischievous smirk',
  'a serene and calm expression'
];


/**
 * Converts a file to a base64 string.
 * @param {File} file The file to convert.
 * @returns {Promise<{base64: string, mimeType: string}>} The base64 representation and mime type.
 */
function fileToGenerativePart(file: File): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a descriptive prompt from an image.
 * @param {string} base64Image The base64 encoded image.
 * @param {string} mimeType The mime type of the image.
 * @returns {Promise<string>} A descriptive prompt.
 */
async function generateDescriptionFromImage(base64Image: string, mimeType: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: visionModel,
        contents: {
            parts: [
                {
                    text: 'Act as an expert character concept artist. Your goal is to create a "character sheet" prompt that ensures perfect consistency for an image generation model. Focus obsessively on the face. Break down every facial feature with extreme detail: eye shape (e.g., "almond-shaped," "hooded"), eye color (be specific, e.g., "emerald green with gold flecks"), nose bridge and tip, lip shape and fullness, jawline (e.g., "sharp," "soft"), and any unique markers like freckles or scars. After the face, describe hair style and color, then clothing in detail. Conclude with the art style (e.g., "modern anime style with soft lighting"). The output must be a single, dense paragraph, ready to be used as a base prompt.'
                },
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
            ],
        },
    });
    return response.text.trim();
}


/**
 * Generates a single image based on two reference images and a prompt.
 * @param {string} prompt The full prompt for image generation.
 * @param {object} imageParts1 The generative parts for character 1.
 * @param {object} imageParts2 The generative parts for character 2.
 * @param {HTMLElement} imageGallery The gallery element to append the image to.
 */
async function generateAndDisplayImage(prompt: string, imageParts1: { base64: string, mimeType: string }, imageParts2: { base64: string, mimeType: string }, imageGallery: HTMLElement) {
    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: {
            parts: [
                { inlineData: { data: imageParts1.base64, mimeType: imageParts1.mimeType } },
                { inlineData: { data: imageParts2.base64, mimeType: imageParts2.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                const img = new Image();
                img.src = src;
                img.alt = prompt;
                imageGallery.appendChild(img);
                break; // Assume one image is generated per call
            }
        }
    }
}

async function main() {
    const imageUpload1 = document.getElementById('image-upload-1') as HTMLInputElement;
    const analyzeButton1 = document.getElementById('analyze-button-1') as HTMLButtonElement;
    const imagePreview1 = document.getElementById('image-preview-1') as HTMLImageElement;
    const promptInput1 = document.getElementById('prompt-input-1') as HTMLTextAreaElement;

    const imageUpload2 = document.getElementById('image-upload-2') as HTMLInputElement;
    const analyzeButton2 = document.getElementById('analyze-button-2') as HTMLButtonElement;
    const imagePreview2 = document.getElementById('image-preview-2') as HTMLImageElement;
    const promptInput2 = document.getElementById('prompt-input-2') as HTMLTextAreaElement;
    
    const descriptionSection = document.getElementById('description-section');
    const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
    const loadingIndicator = document.getElementById('loading-indicator');
    const imageGallery = document.getElementById('image-gallery');
    const customPosesInput = document.getElementById('custom-poses-input') as HTMLTextAreaElement;

    if (!imageUpload1 || !analyzeButton1 || !imagePreview1 || !promptInput1 ||
        !imageUpload2 || !analyzeButton2 || !imagePreview2 || !promptInput2 ||
        !descriptionSection || !generateButton || !loadingIndicator || !imageGallery || !customPosesInput) {
        console.error('Required HTML elements not found.');
        return;
    }

    let uploadedFile1: File | null = null;
    let uploadedFileParts1: { base64: string, mimeType: string } | null = null;
    let uploadedFile2: File | null = null;
    let uploadedFileParts2: { base64: string, mimeType: string } | null = null;

    function checkAndShowDescriptionSection() {
        if (uploadedFileParts1 && uploadedFileParts2) {
            descriptionSection.classList.remove('hidden');
        }
    }

    imageUpload1.addEventListener('change', () => {
        if (imageUpload1.files && imageUpload1.files.length > 0) {
            uploadedFile1 = imageUpload1.files[0];
            analyzeButton1.disabled = false;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview1.src = e.target?.result as string;
            };
            reader.readAsDataURL(uploadedFile1);
            uploadedFileParts1 = null;
            promptInput1.value = '';
            descriptionSection.classList.add('hidden');
        } else {
            uploadedFile1 = null;
            analyzeButton1.disabled = true;
        }
    });

    imageUpload2.addEventListener('change', () => {
        if (imageUpload2.files && imageUpload2.files.length > 0) {
            uploadedFile2 = imageUpload2.files[0];
            analyzeButton2.disabled = false;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview2.src = e.target?.result as string;
            };
            reader.readAsDataURL(uploadedFile2);
            uploadedFileParts2 = null;
            promptInput2.value = '';
            descriptionSection.classList.add('hidden');
        } else {
            uploadedFile2 = null;
            analyzeButton2.disabled = true;
        }
    });

    async function handleAnalysis(
        file: File | null,
        button: HTMLButtonElement,
        promptInput: HTMLTextAreaElement
    ): Promise<{ base64: string, mimeType: string } | null> {
        if (!file) {
            alert('Please upload an image first.');
            return null;
        }

        try {
            button.disabled = true;
            loadingIndicator.style.color = '#f0f0f0';
            loadingIndicator.textContent = 'Analyzing character...';
            loadingIndicator.style.display = 'block';

            const fileParts = await fileToGenerativePart(file);
            const description = await generateDescriptionFromImage(fileParts.base64, fileParts.mimeType);
            
            promptInput.value = description;
            loadingIndicator.style.display = 'none';
            return fileParts;

        } catch (error) {
            console.error("Error during analysis:", error);
            loadingIndicator.textContent = `Error: Could not analyze ${button.id.includes('1') ? 'Character 1' : 'Character 2'}. Check the console.`;
            loadingIndicator.style.color = 'red';
            return null;
        } finally {
             button.disabled = false;
        }
    }

    analyzeButton1.addEventListener('click', async () => {
        uploadedFileParts1 = await handleAnalysis(uploadedFile1, analyzeButton1, promptInput1);
        checkAndShowDescriptionSection();
    });

    analyzeButton2.addEventListener('click', async () => {
        uploadedFileParts2 = await handleAnalysis(uploadedFile2, analyzeButton2, promptInput2);
        checkAndShowDescriptionSection();
    });

    /**
     * Kicks off the image generation process with a given set of poses.
     * @param posesToGenerate An array of pose description strings.
     */
    async function startGeneration(posesToGenerate: string[]) {
        const basePrompt1 = promptInput1.value.trim();
        const basePrompt2 = promptInput2.value.trim();

        if (!basePrompt1 || !basePrompt2) {
            alert('Both character descriptions cannot be empty.');
            return;
        }

        if (!uploadedFileParts1 || !uploadedFileParts2) {
            alert('Analysis data is missing for one or both characters. Please upload and analyze both images.');
            return;
        }
        
        try {
            generateButton.disabled = true;
            imageGallery.textContent = '';
            loadingIndicator.style.color = '#f0f0f0';
            loadingIndicator.textContent = `Generating ${posesToGenerate.length} poses, this may take a moment...`;
            loadingIndicator.style.display = 'block';

            for (const pose of posesToGenerate) {
                const expression = expressions[Math.floor(Math.random() * expressions.length)];
                const fullPrompt = `Character 1 is described as: "${basePrompt1}". Character 2 is described as: "${basePrompt2}". Using the first provided image as a strict reference for Character 1's face, appearance, and art style, and the second image for Character 2, redraw them both together in the following scene: ${pose}. Both characters should have ${expression} on their faces. Do not alter their identities.`;
                await generateAndDisplayImage(fullPrompt, uploadedFileParts1, uploadedFileParts2, imageGallery);
            }

            loadingIndicator.style.display = 'none';

        } catch (error) {
            console.error("Error during generation process:", error);
            loadingIndicator.textContent = 'Error: Could not load images. Check the console for details.';
            loadingIndicator.style.color = 'red';
        } finally {
            generateButton.disabled = false;
        }
    }
    
    generateButton.addEventListener('click', () => {
        const customPosesText = customPosesInput.value.trim();
        let posesToGenerate: string[];

        if (customPosesText) {
            posesToGenerate = customPosesText
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
        } else {
            // Use default poses if the input is empty
            posesToGenerate = poses;
        }

        const maxPoses = 10;
        if (posesToGenerate.length > maxPoses) {
            if (customPosesText) { // Only show alert if user provided custom poses
                alert(`You have entered ${posesToGenerate.length} poses. The maximum number of poses allowed is ${maxPoses}. Only the first ${maxPoses} will be generated.`);
            }
            posesToGenerate = posesToGenerate.slice(0, maxPoses);
        }

        if (posesToGenerate.length > 0) {
            startGeneration(posesToGenerate);
        } else {
            alert('Please enter at least one pose description, or leave the box empty to use the default poses.');
        }
    });
}

main();