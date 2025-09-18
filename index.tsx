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
const twoCharacterPoses = [
  'A dramatic low-angle shot of both characters standing back-to-back, preparing for a fight.',
  'An over-the-shoulder shot of character 1 teaching character 2 a new skill.',
  'A profile view of the two characters shaking hands, sealing an agreement.',
  'A close-up shot focusing on both characters laughing together at a shared joke.',
  'An action shot of the two characters working together to overcome an obstacle.',
];

const singleCharacterPoses = [
  'A dynamic low-angle shot of the character striking a heroic pose.',
  'A thoughtful profile view of the character looking into the distance.',
  'A close-up shot capturing a moment of intense emotion on the character\'s face.',
  'A full-body shot of the character in a fighting stance, ready for action.',
  'A cozy scene of the character reading a book, seen from a high angle.',
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
 * Generates a descriptive prompt for a character image.
 * @param {string} base64Image The base64 encoded image.
 * @param {string} mimeType The mime type of the image.
 * @returns {Promise<string>} A descriptive prompt.
 */
async function generateDescriptionFromCharacterImage(base64Image: string, mimeType: string): Promise<string> {
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
 * Generates a descriptive prompt for a prop image.
 * @param {string} base64Image The base64 encoded image.
 * @param {string} mimeType The mime type of the image.
 * @returns {Promise<string>} A descriptive prompt.
 */
async function generateDescriptionFromPropImage(base64Image: string, mimeType: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: visionModel,
        contents: {
            parts: [
                {
                    text: 'Act as an expert concept artist. Your goal is to create a "prop sheet" prompt for an image generation model. Describe the object in extreme detail. Focus on its material (e.g., "worn leather," "polished chrome"), texture, shape, color palette, size, specific markings or engravings, and overall art style. The output must be a single, dense paragraph, ready to be used as a base prompt.'
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
 * Generates a single image and replaces a placeholder element with the result.
 * @param {string} prompt The full prompt for image generation.
 * @param {object} imageParts1 The generative parts for character 1.
 * @param {object | null} imageParts2 The generative parts for character 2.
 * @param {object | null} imagePartsProp The generative parts for the prop.
 * @param {HTMLElement} placeholderElement The placeholder element to replace.
 */
async function generateAndDisplayImage(prompt: string, imageParts1: { base64: string, mimeType: string }, imageParts2: { base64: string, mimeType: string } | null, imagePartsProp: { base64: string, mimeType: string } | null, placeholderElement: HTMLElement) {
    try {
        const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
            { inlineData: { data: imageParts1.base64, mimeType: imageParts1.mimeType } },
        ];

        if (imageParts2) {
            parts.push({ inlineData: { data: imageParts2.base64, mimeType: imageParts2.mimeType } });
        }
        if (imagePartsProp) {
            parts.push({ inlineData: { data: imagePartsProp.base64, mimeType: imagePartsProp.mimeType } });
        }
        parts.push({ text: prompt });
        
        const response = await ai.models.generateContent({
            model: imageEditModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    
                    const galleryCard = document.createElement('div');
                    galleryCard.className = 'gallery-card';

                    const img = new Image();
                    img.src = src;
                    img.alt = prompt;

                    const overlay = document.createElement('div');
                    overlay.className = 'gallery-overlay';

                    const downloadButton = document.createElement('button');
                    downloadButton.className = 'download-button';
                    downloadButton.textContent = 'Download';
                    downloadButton.onclick = () => {
                        const a = document.createElement('a');
                        a.href = src;
                        a.download = `pose-${Date.now()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    };

                    overlay.appendChild(downloadButton);
                    galleryCard.appendChild(img);
                    galleryCard.appendChild(overlay);

                    placeholderElement.replaceWith(galleryCard);
                    return; // Exit after finding the first image
                }
            }
        }
        // If no image part was found in a successful response
        throw new Error('No image data found in response.');

    } catch (error) {
        console.error('Image generation failed for prompt:', prompt, error);
        placeholderElement.innerHTML = '&#x26A0;<br/>Failed'; // Warning sign icon
        placeholderElement.classList.add('generation-error');
    }
}

async function main() {
    // Character 1 controls
    const imageUpload1 = document.getElementById('image-upload-1') as HTMLInputElement;
    const analyzeButton1 = document.getElementById('analyze-button-1') as HTMLButtonElement;
    const imagePreview1 = document.getElementById('image-preview-1') as HTMLImageElement;
    const promptInput1 = document.getElementById('prompt-input-1') as HTMLTextAreaElement;

    // Character 2 controls
    const imageUpload2 = document.getElementById('image-upload-2') as HTMLInputElement;
    const analyzeButton2 = document.getElementById('analyze-button-2') as HTMLButtonElement;
    const imagePreview2 = document.getElementById('image-preview-2') as HTMLImageElement;
    const promptInput2 = document.getElementById('prompt-input-2') as HTMLTextAreaElement;
    const characterEditor2 = document.getElementById('character-editor-2') as HTMLElement;

    // Prop controls
    const imageUploadProp = document.getElementById('image-upload-prop') as HTMLInputElement;
    const analyzeButtonProp = document.getElementById('analyze-button-prop') as HTMLButtonElement;
    const imagePreviewProp = document.getElementById('image-preview-prop') as HTMLImageElement;
    const promptInputProp = document.getElementById('prompt-input-prop') as HTMLTextAreaElement;
    const characterEditorProp = document.getElementById('character-editor-prop') as HTMLElement;
    
    // Global controls
    const descriptionSection = document.getElementById('description-section') as HTMLElement;
    const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
    const imageGallery = document.getElementById('image-gallery') as HTMLElement;
    const customPosesInput = document.getElementById('custom-poses-input') as HTMLTextAreaElement;

    if (!imageUpload1 || !analyzeButton1 || !imagePreview1 || !promptInput1 ||
        !imageUpload2 || !analyzeButton2 || !imagePreview2 || !promptInput2 || !characterEditor2 ||
        !imageUploadProp || !analyzeButtonProp || !imagePreviewProp || !promptInputProp || !characterEditorProp ||
        !descriptionSection || !generateButton || !imageGallery || !customPosesInput) {
        console.error('Required HTML elements not found.');
        return;
    }

    let uploadedFile1: File | null = null;
    let uploadedFileParts1: { base64: string, mimeType: string } | null = null;
    let uploadedFile2: File | null = null;
    let uploadedFileParts2: { base64: string, mimeType: string } | null = null;
    let uploadedFileProp: File | null = null;
    let uploadedFilePartsProp: { base64: string, mimeType: string } | null = null;

    function checkAndShowSections() {
        if (uploadedFileParts1) {
            descriptionSection.classList.remove('hidden');
        } else {
            descriptionSection.classList.add('hidden');
        }

        if(uploadedFileParts2) {
            characterEditor2.classList.remove('hidden');
        } else {
            characterEditor2.classList.add('hidden');
        }

        if(uploadedFilePartsProp) {
            characterEditorProp.classList.remove('hidden');
        } else {
            characterEditorProp.classList.add('hidden');
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
            checkAndShowSections();
        } else {
            uploadedFile1 = null;
            uploadedFileParts1 = null;
            analyzeButton1.disabled = true;
            checkAndShowSections();
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
            checkAndShowSections();
        } else {
            uploadedFile2 = null;
            uploadedFileParts2 = null;
            analyzeButton2.disabled = true;
            checkAndShowSections();
        }
    });

    imageUploadProp.addEventListener('change', () => {
        if (imageUploadProp.files && imageUploadProp.files.length > 0) {
            uploadedFileProp = imageUploadProp.files[0];
            analyzeButtonProp.disabled = false;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreviewProp.src = e.target?.result as string;
            };
            reader.readAsDataURL(uploadedFileProp);
            uploadedFilePartsProp = null;
            promptInputProp.value = '';
            checkAndShowSections();
        } else {
            uploadedFileProp = null;
            uploadedFilePartsProp = null;
            analyzeButtonProp.disabled = true;
            checkAndShowSections();
        }
    });

    async function handleAnalysis(
        file: File | null,
        button: HTMLButtonElement,
        promptInput: HTMLTextAreaElement,
        descriptionGenerator: (base64: string, mimeType: string) => Promise<string>
    ): Promise<{ base64: string, mimeType: string } | null> {
        if (!file) {
            alert('Please upload an image first.');
            return null;
        }

        const originalButtonText = button.textContent;
        try {
            button.disabled = true;
            button.textContent = 'Analyzing...';
            
            const fileParts = await fileToGenerativePart(file);
            const description = await descriptionGenerator(fileParts.base64, fileParts.mimeType);
            
            promptInput.value = description;
            return fileParts;

        } catch (error) {
            console.error(`Error during analysis:`, error);
            alert('Could not analyze the image. Check the console for details.');
            return null;
        } finally {
             button.disabled = false;
             button.textContent = originalButtonText;
        }
    }

    analyzeButton1.addEventListener('click', async () => {
        uploadedFileParts1 = await handleAnalysis(uploadedFile1, analyzeButton1, promptInput1, generateDescriptionFromCharacterImage);
        checkAndShowSections();
    });

    analyzeButton2.addEventListener('click', async () => {
        uploadedFileParts2 = await handleAnalysis(uploadedFile2, analyzeButton2, promptInput2, generateDescriptionFromCharacterImage);
        checkAndShowSections();
    });

    analyzeButtonProp.addEventListener('click', async () => {
        uploadedFilePartsProp = await handleAnalysis(uploadedFileProp, analyzeButtonProp, promptInputProp, generateDescriptionFromPropImage);
        checkAndShowSections();
    });

    /**
     * Kicks off the image generation process with a given set of poses.
     * @param posesToGenerate An array of pose description strings.
     */
    async function startGeneration(posesToGenerate: string[]) {
        const basePrompt1 = promptInput1.value.trim();
        const basePrompt2 = promptInput2.value.trim();
        const basePromptProp = promptInputProp.value.trim();

        if (!basePrompt1 || !uploadedFileParts1) {
            alert('Character 1 description and analysis data are required. Please upload and analyze the image.');
            return;
        }

        if (uploadedFileParts2 && !basePrompt2) {
             alert('Character 2 has an image uploaded but no description. Please analyze the character or clear the image.');
             return;
        }
        
        if (uploadedFilePartsProp && !basePromptProp) {
             alert('The prop has an image uploaded but no description. Please analyze the prop or clear the image.');
             return;
        }
        
        const originalButtonText = generateButton.textContent;
        try {
            generateButton.disabled = true;
            generateButton.textContent = `Generating (${posesToGenerate.length})...`;
            imageGallery.textContent = '';
            
            const consistentBackground = 'The background must be a consistent, neutral, soft-focus studio background for all generated images. This is essential for character consistency.';

            const generationPromises = posesToGenerate.map(pose => {
                const placeholder = document.createElement('div');
                placeholder.className = 'gallery-placeholder';
                imageGallery.appendChild(placeholder);
                
                const expression = expressions[Math.floor(Math.random() * expressions.length)];
                let fullPrompt: string;
                let propInstruction = '';

                if (basePromptProp && uploadedFilePartsProp) {
                    propInstruction = ` The scene must also include a prop described as "${basePromptProp}", using the provided prop image as a strict reference for its appearance.`;
                }
                
                const sceneInstruction = `Redraw them in the following scene: "${pose}". It is CRITICAL to accurately render the specified camera angle (e.g., 'profile view', 'low-angle shot', 'close-up'). The pose and angle are the main focus.`;

                if (basePrompt2 && uploadedFileParts2) {
                    // Two characters prompt
                    fullPrompt = `You are a master character artist. Your task is to generate a scene with two characters. Character 1 is described as: "${basePrompt1}". Character 2 is described as: "${basePrompt2}". Use the first provided image as a strict and absolute reference for Character 1's face, appearance, and art style. Use the second image for Character 2. Preserving the exact likeness from the reference images is the highest priority. ${sceneInstruction}${propInstruction} Both characters should have ${expression}. ${consistentBackground}`;
                } else {
                    // Single character prompt
                    fullPrompt = `You are a master character artist. Your task is to generate a scene with one character. The character is described as: "${basePrompt1}". Use the provided image as a strict and absolute reference for the character's face, appearance, and art style. Preserving the exact likeness from the reference image is the highest priority. ${sceneInstruction}${propInstruction} The character should have ${expression}. ${consistentBackground}`;
                }

                return generateAndDisplayImage(fullPrompt, uploadedFileParts1, uploadedFileParts2, uploadedFilePartsProp, placeholder);
            });
            
            await Promise.all(generationPromises);

        } catch (error) {
            console.error("Error during generation setup:", error);
            alert('An unexpected error occurred. Check the console for details.');
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = originalButtonText;
        }
    }
    
    generateButton.addEventListener('click', () => {
        const customPosesText = customPosesInput.value.trim();
        let posesToGenerate: string[];

        if (customPosesText) {
            posesToGenerate = customPosesText
                .split(/\r\n|\r|\n/) // Use a more robust regex to split lines, handling CRLF, CR, and LF.
                .map(p => p.trim())
                .filter(p => p.length > 0);
        } else {
            // Use default poses based on number of characters
            posesToGenerate = uploadedFileParts2 ? twoCharacterPoses : singleCharacterPoses;
        }

        const maxPoses = 5;
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