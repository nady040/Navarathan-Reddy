/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, Modality} from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const imageEditModel = 'gemini-2.5-flash-image';
const visionModel = 'gemini-2.5-flash';

// Array of different poses to generate
const poses = [
  // Combat / Action
  'in a dynamic high-kick pose',
  'launching a powerful uppercut',
  'wielding a long wooden bo staff in a defensive stance',
  'drawing a sword from its sheath',
  'aiming a bow and arrow',
  'casting a magic spell with glowing hands',
  
  // Stances
  'in a graceful crane stance, balancing on one leg',
  'in a low, powerful horse stance with fists ready',
  'in a classic praying mantis style pose',
  'executing a fluid snake style movement, low to the ground',

  // Dramatic / Emotive
  'standing on a cliff edge, cape billowing in the wind',
  'looking over their shoulder with a mysterious expression',
  'raising a triumphant fist to the sky',
  'kneeling in defeat, head bowed',
  
  // Relaxing / Casual
  'leaning against a wall, arms crossed casually',
  'sitting by a campfire, looking thoughtful',
  'reading a book in a comfortable chair',
  'walking through a bustling city street'
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
 * Generates a single image based on a reference image and a prompt, then appends it to a parent element.
 * @param {string} prompt The full prompt for image generation.
 * @param {string} base64Image The base64 encoded reference image.
 * @param {string} mimeType The mime type of the reference image.
 * @param {HTMLElement} parentElement The element to append the image to.
 * @param {boolean} clearParent Whether to clear the parent element before appending.
 */
async function generateAndDisplayImage(prompt: string, base64Image: string, mimeType: string, parentElement: HTMLElement, clearParent: boolean) {
    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    if (response?.candidates?.[0]?.content?.parts) {
        if (clearParent) {
            parentElement.innerHTML = '';
        }
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                const img = new Image();
                img.src = src;
                img.alt = prompt;
                parentElement.appendChild(img);
                break; // Assume one image is generated per call
            }
        }
    }
}

async function main() {
    // UI elements
    const controls = document.getElementById('controls');
    const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
    const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
    const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
    const modificationSelect = document.getElementById('modification-select') as HTMLSelectElement;
    const artStyleSelect = document.getElementById('art-style-select') as HTMLSelectElement;
    const loadingIndicator = document.getElementById('loading-indicator');
    const imageGallery = document.getElementById('image-gallery');
    
    // Confirmation step elements
    const confirmationStep = document.getElementById('confirmation-step');
    const sampleImageContainer = document.getElementById('sample-image-container');
    const regenerateButton = document.getElementById('regenerate-button') as HTMLButtonElement;
    const confirmButton = document.getElementById('confirm-button') as HTMLButtonElement;


    if (!controls || !imageUpload || !generateButton || !imagePreview || !modificationSelect || !artStyleSelect || !loadingIndicator || !imageGallery || !confirmationStep || !sampleImageContainer || !regenerateButton || !confirmButton) {
        console.error('Required HTML elements not found.');
        return;
    }

    // State variables
    let uploadedFile: File | null = null;
    let basePrompt = '';
    let uploadedFileParts: { base64: string; mimeType: string; } | null = null;


    imageUpload.addEventListener('change', () => {
        if (imageUpload.files && imageUpload.files.length > 0) {
            uploadedFile = imageUpload.files[0];
            generateButton.disabled = false;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target?.result as string;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(uploadedFile);
            // Reset state on new image upload
            imageGallery.innerHTML = '';
            loadingIndicator.style.display = 'none';
            confirmationStep.classList.add('hidden');
            controls.classList.remove('hidden');
            basePrompt = '';
            uploadedFileParts = null;

        } else {
            uploadedFile = null;
            generateButton.disabled = true;
            imagePreview.classList.add('hidden');
        }
    });
    
    const generateSample = async () => {
        if (!uploadedFile) return;

        regenerateButton.disabled = true;
        confirmButton.disabled = true;
        loadingIndicator.style.color = '#f0f0f0';
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Generating sample image...';

        try {
            // 1. Analyze character (only if not already done)
            if (!basePrompt || !uploadedFileParts) {
                loadingIndicator.textContent = 'Analyzing character...';
                uploadedFileParts = await fileToGenerativePart(uploadedFile);
                basePrompt = await generateDescriptionFromImage(uploadedFileParts.base64, uploadedFileParts.mimeType);
            }
            
            loadingIndicator.textContent = 'Generating sample image...';

            // 2. Generate one pose
            const pose = poses[Math.floor(Math.random() * poses.length)];
            const expression = expressions[Math.floor(Math.random() * expressions.length)];
            const modification = modificationSelect.value;
            const artStyle = artStyleSelect.value;
            const modificationText = modification !== 'none' ? ` depicted ${modification}` : '';

            let artStyleText = ` The art style MUST perfectly match the style of the reference image.`;
            if (artStyle !== 'none') {
                artStyleText = ` The final image should be rendered in a ${artStyle} style.`;
            }

            const fullPrompt = `Using the character description "${basePrompt}" and the provided image as the absolute ground truth for the character's appearance, redraw the character${modificationText}. The character must be in the following pose: '${pose}', with ${expression} on their face. It is absolutely crucial to maintain perfect consistency with the original character's facial features, hair, and overall identity.${artStyleText}`;
            
            await generateAndDisplayImage(fullPrompt, uploadedFileParts!.base64, uploadedFileParts!.mimeType, sampleImageContainer, true);

            // 3. Show confirmation UI
            controls.classList.add('hidden');
            confirmationStep.classList.remove('hidden');
            loadingIndicator.style.display = 'none';

        } catch (error) {
            console.error("Error during sample generation:", error);
            loadingIndicator.textContent = 'Error: Could not generate sample. Check console.';
            loadingIndicator.style.color = 'red';
        } finally {
            regenerateButton.disabled = false;
            confirmButton.disabled = false;
        }
    }

    generateButton.addEventListener('click', async () => {
        if (!uploadedFile) {
            alert('Please upload an image first.');
            return;
        }
        imageGallery.innerHTML = '';
        await generateSample();
    });

    regenerateButton.addEventListener('click', generateSample);

    confirmButton.addEventListener('click', async () => {
        if (!basePrompt || !uploadedFileParts) {
            alert('Something went wrong, please start over.');
            return;
        }

        try {
            regenerateButton.disabled = true;
            confirmButton.disabled = true;
            confirmationStep.classList.add('hidden');
            loadingIndicator.style.display = 'block';
            loadingIndicator.style.color = '#f0f0f0';

            // Move confirmed sample to main gallery
            const sampleImg = sampleImageContainer.querySelector('img');
            if (sampleImg) {
                imageGallery.appendChild(sampleImg);
            }

            // Generate 4 more poses
            const shuffledPoses = [...poses].sort(() => 0.5 - Math.random());
            const selectedPoses = shuffledPoses.slice(0, 4);

            loadingIndicator.textContent = `Generating ${selectedPoses.length} more poses...`;

            const modification = modificationSelect.value;
            const artStyle = artStyleSelect.value;

            for (const pose of selectedPoses) {
                const expression = expressions[Math.floor(Math.random() * expressions.length)];
                const modificationText = modification !== 'none' ? ` depicted ${modification}` : '';
                let artStyleText = ` The art style MUST perfectly match the style of the reference image.`;
                if (artStyle !== 'none') {
                    artStyleText = ` The final image should be rendered in a ${artStyle} style.`;
                }
                const fullPrompt = `Using the character description "${basePrompt}" and the provided image as the absolute ground truth for the character's appearance, redraw the character${modificationText}. The character must be in the following pose: '${pose}', with ${expression} on their face. It is absolutely crucial to maintain perfect consistency with the original character's facial features, hair, and overall identity.${artStyleText}`;
                
                await generateAndDisplayImage(fullPrompt, uploadedFileParts.base64, uploadedFileParts.mimeType, imageGallery, false);
            }

            loadingIndicator.style.display = 'none';
            controls.classList.remove('hidden');

        } catch (error) {
            console.error("Error during final generation process:", error);
            loadingIndicator.textContent = 'Error: Could not generate images. Check the console for details.';
            loadingIndicator.style.color = 'red';
        } finally {
            regenerateButton.disabled = false;
            confirmButton.disabled = false;
            generateButton.disabled = false;
        }
    });
}

main();