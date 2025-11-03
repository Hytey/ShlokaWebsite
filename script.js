  const welcomeHeading = document.getElementById('welcomeHeading')
        const welcomeHeadingInside = `यथा पुष्पं न पात्येत वासितं हि समन्ततः।
        \n
        तथा सत्पुरुषैर्नित्यं कार्यं यत्सर्वहिताय वै॥`
        const guitarButton = document.getElementById('guitarButton')
        const artButton = document.getElementById('artButton')
        const contactSection = document.getElementById('contact')

 
        
        let Random_Variable = 0;


        function Writing_Function() {
            if (welcomeHeading.textContent.length < welcomeHeadingInside.length) {
                // console.log(welcomeHeadingInside.innerText)
                welcomeHeading.textContent += welcomeHeadingInside[Random_Variable]
                Random_Variable++
                // console.log(window.scrollY)
            } else {
            }
        }
        const Writing_Interval = setInterval(Writing_Function, 30)




          // --- Gemini AI API Logic ---
            const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
            const API_KEY = "AIzaSyDnGd_wGuwRvTNjQQaIHFOjNu2oOZQEobo"; // Leave blank, will be populated at runtime
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

            // Helper: Toggle loader
            function toggleLoader(button, isLoading) {
                const text = button.querySelector('.button-text');
                const loader = button.querySelector('.button-loader');
                if (isLoading) {
                    if(text) text.classList.add('hidden');
                    if(loader) loader.classList.remove('hidden');
                    button.disabled = true;
                } else {
                    if(text) text.classList.remove('hidden');
                    if(loader) loader.classList.add('hidden');
                    button.disabled = false;
                }
            }
            
            // Helper: Format AI response
            function formatAIResponse(text) {
                // Convert markdown-like **bold** to <strong>
                let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                // Convert markdown-like *italic* to <em>
                html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
                
                // Convert newlines to paragraphs
                html = html.split('\n\n').map(p => `<p class="ai-message">${p.replace(/\n/g, '<br>')}</p>`).join('');

                // Fix stray <p> tags if split was not perfect
                html = html.replace(/<p class="ai-message"><\/p>/g, '');
                
                return html;
            }

            // Helper: Sanitize text to prevent HTML injection
            function sanitize(text) {
                const el = document.createElement('div');
                el.textContent = text;
                return el.innerHTML;
            }
            
            // Helper: Exponential backoff fetch
            async function fetchWithBackoff(url, options, retries = 3, delay = 1000) {
                try {
                    const response = await fetch(url, options);
                    if (!response.ok) {
                        if (response.status === 429 && retries > 0) { // Throttling
                            await new Promise(res => setTimeout(res, delay));
                            return fetchWithBackoff(url, options, retries - 1, delay * 2);
                        }
                        const errorBody = await response.json();
                        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody?.error?.message || 'Unknown error'}`);
                    }
                    return response.json();
                } catch (error) {
                    if (retries > 0 && !(error.message.startsWith("API Error"))) { // Network errors
                        await new Promise(res => setTimeout(res, delay));
                        return fetchWithBackoff(url, options, retries - 1, delay * 2);
                    }
                    console.error(error); // Log the error
                    throw error;
                }
            }

            // Core AI call function
            async function callGemini(systemInstruction, userQuery, useGoogleSearch = false) {
                const payload = {
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    tools: useGoogleSearch ? [{ "google_search": {} }] : []
                };

                const result = await fetchWithBackoff(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const candidate = result.candidates?.[0];
                if (candidate && candidate.content?.parts?.[0]?.text) {
                    return candidate.content.parts[0].text; // Return raw text for formatting
                } else {
                    let reason = "No valid response from AI.";
                    if (candidate?.finishReason === "SAFETY") {
                        reason = "Response blocked due to safety settings.";
                    } else if (candidate?.finishReason === "RECITATION") {
                        reason = "Response blocked due to recitation policy.";
                    } else if (!candidate) {
                        reason = `No response candidate found. Full result: ${JSON.stringify(result, null, 2)}`;
                    }
                    throw new Error(reason);
                }
            }
            
            // --- Tool 1: AI Acharya ---
            const acharyaInput = document.getElementById('acharya-input');
            const acharyaButton = document.getElementById('acharya-button');
            const acharyaChatWindow = document.getElementById('acharya-chat-window');

            const acharyaSystemPrompt = `You are "AI Acharya," an expert in Sanskrit, Vedic philosophy (Advaita, Dvaita, etc.), and Hindu scriptures (Vedas, Upanishads, Puranas, Gita). Your persona is that of a wise, patient, and encouraging teacher (Guru).
            Your task is to:
            1.  Receive a question from the user.
            2.  Provide a clear, insightful, and easy-to-understand explanation, in Hinglish (mix of Hindi and English) if the user's query suggests it.
            3.  If it's a shloka, provide the Devanagari script, a word-by-word breakdown, and the philosophical meaning.
            4.  Maintain a respectful, scholarly, yet approachable tone.
            5.  Format your response in simple markdown (bold, lists).
            6.  Keep responses concise but comprehensive. End with an encouraging closing.`;

            async function handleAcharyaQuery() {
                const query = acharyaInput.value;
                if (!query.trim()) return;

                toggleLoader(acharyaButton, true);
                acharyaInput.value = '';
                // Add user message to chat
                acharyaChatWindow.innerHTML += `<div class="user-message"><p><strong>You:</strong> ${sanitize(query)}</p></div>`;
                acharyaChatWindow.scrollTop = acharyaChatWindow.scrollHeight;

                try {
                    const rawResponse = await callGemini(acharyaSystemPrompt, query);
                    const responseHtml = formatAIResponse(rawResponse);
                    acharyaChatWindow.innerHTML += responseHtml;
                } catch (error) {
                    console.error("Acharya Error:", error);
                    acharyaChatWindow.innerHTML += `<div class="ai-message" style="color: #ff8a8a;"><p><strong>Acharya:</strong> My apologies, I encountered an error: ${error.message}</p></div>`;
                } finally {
                    toggleLoader(acharyaButton, false);
                    acharyaChatWindow.scrollTop = acharyaChatWindow.scrollHeight;
                }
            }
            if(acharyaButton) acharyaButton.addEventListener('click', handleAcharyaQuery);
            if(acharyaInput) acharyaInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter' && !e.shiftKey) { // Press Enter to send
                    e.preventDefault();
                    handleAcharyaQuery();
                }
            });

            // --- Tool 2: Concept Deconstructor ---
            const deconButton = document.getElementById('decon-button');
            const deconSystemPrompt = `You are a "Concept Deconstructor." Your task is to take a complex topic from the user and explain it using the 'Neti, Neti' ("Not this, Not this") method, inspired by the Nirvana Shatakam.
            1.  Start by defining what the concept is *not*. (e.g., "AI is not human intelligence. It is not consciousness.")
            2.  Peel away these layers of misunderstanding.
            3.  Conclude with a simple, core definition of what the concept *is*.
            4.  Format your response in simple markdown (bold, lists).
            5.  Be clear and concise.`;

            if(deconButton) deconButton.addEventListener('click', async () => {
                const query = document.getElementById('decon-input').value;
                if (!query.trim()) return;
                
                toggleLoader(deconButton, true);
                const responseDiv = document.getElementById('decon-response');
                responseDiv.classList.add('hidden');

                try {
                    const rawResponse = await callGemini(deconSystemPrompt, `Deconstruct the concept: ${query}`);
                    responseDiv.innerHTML = formatAIResponse(rawResponse);
                    responseDiv.classList.remove('hidden');
                } catch (error) {
                    console.error("Deconstructor Error:", error);
                    responseDiv.innerHTML = `<p class="ai-message" style="color: #ff8a8a;">An error occurred: ${error.message}</p>`;
                    responseDiv.classList.remove('hidden');
                } finally {
                    toggleLoader(deconButton, false);
                }
            });

            // --- Tool 3: Ethical Simulator ---
            const dilemmaButton = document.getElementById('dilemma-button');
            const dilemmaSystemPrompt = `You are an "Ethical Simulator." Your goal is to help the user think about the 'नीतिमार्ग' (path of ethics).
            1.  Generate a short, modern, practical ethical dilemma (2-3 sentences).
            2.  The dilemma should be relatable (e.g., work, school, personal life).
            3.  Do NOT provide an answer.
            4.  End by prompting the user to think about the right course of action.
            5.  Format as a single paragraph.`;
            
            if(dilemmaButton) dilemmaButton.addEventListener('click', async () => {
                toggleLoader(dilemmaButton, true);
                const responseDiv = document.getElementById('dilemma-response');
                const followUpDiv = document.getElementById('dilemma-follow-up');
                responseDiv.classList.add('hidden');
                followUpDiv.classList.add('hidden');

                try {
                    const rawResponse = await callGemini(dilemmaSystemPrompt, "Give me an ethical dilemma.");
                    responseDiv.innerHTML = formatAIResponse(rawResponse);
                    responseDiv.classList.remove('hidden');
                    followUpDiv.classList.remove('hidden');
                } catch (error) {
                    console.error("Dilemma Error:", error);
                    responseDiv.innerHTML = `<p class="ai-message" style="color: #ff8a8a;">An error occurred: ${error.message}</p>`;
                    responseDiv.classList.remove('hidden');
                } finally {
                    toggleLoader(dilemmaButton, false);
                }
            });

            // --- Tool 4: AI Summarizer ---
            const summaryButton = document.getElementById('summary-button');
            const summarySystemPrompt = `You are an "AI Text Summarizer." Your goal is to distill long text into its core essence, making it easy to share, inspired by the shloka "for the welfare of all."
            1.  Receive a block of text from the user.
            2.  Provide a concise summary of the main points.
            3.  Use clear bullet points for key takeaways.
            4.  The summary should be neutral and objective.
            5.  Format your response in simple markdown.`;
            
            if(summaryButton) summaryButton.addEventListener('click', async () => {
                const query = document.getElementById('summary-input').value;
                if (!query.trim()) return;
                
                toggleLoader(summaryButton, true);
                const responseDiv = document.getElementById('summary-response');
                responseDiv.classList.add('hidden');

                try {
                    const rawResponse = await callGemini(summarySystemPrompt, `Summarize this text: ${query}`);
                    responseDiv.innerHTML = formatAIResponse(rawResponse);
                    responseDiv.classList.remove('hidden');
                } catch (error) {
                    console.error("Summarizer Error:", error);
                    responseDiv.innerHTML = `<p class="ai-message" style="color: #ff8a8a;">An error occurred: ${error.message}</p>`;
                    responseDiv.classList.remove('hidden');
                } finally {
                    toggleLoader(summaryButton, false);
                }
            });

            // --- Tool 5: Source Finder ---
            const sourceButton = document.getElementById('source-button');
            const sourceSystemPrompt = `You are a "Scriptural Source Finder," an expert librarian of Vedic and Hindu texts. You are connected to Google Search.
            1.  Receive a user's query about a concept.
            2.  Use Google Search to find the primary scriptural sources (Upanishads, Gita, Puranas, Vedas, etc.) for that concept.
            3.  Present your findings as a list. For each source, provide the text (e.g., "Katha Upanishad") and a brief quote or explanation of how it relates to the concept.
            4.  Be accurate and scholarly. Cite your sources clearly.
            5.  Format in simple markdown.`;
            
            if(sourceButton) sourceButton.addEventListener('click', async () => {
                const query = document.getElementById('source-input').value;
                
                toggleLoader(sourceButton, true);
                const responseDiv = document.getElementById('source-response');
                responseDiv.classList.add('hidden');

                try {
                    const rawResponse = await callGemini(sourceSystemPrompt, query, true); // Enable Google Search
                    responseDiv.innerHTML = formatAIResponse(rawResponse);
                    responseDiv.classList.remove('hidden');
                } catch (error) {
                    console.error("Source Finder Error:", error);
                    responseDiv.innerHTML = `<p class="ai-message" style="color: #ff8a8a;">An error occurred: ${error.message}</p>`;
                    responseDiv.classList.remove('hidden');
                } finally {
                    toggleLoader(sourceButton, false);
                }
            });

        




            //for navigation 
             const navLinks = document.querySelectorAll('.nav-link, .nav-link-card, .nav-link-inline');
            const contentPanels = document.querySelectorAll('.content-panel');
            const mainNavLinks = document.querySelectorAll('nav .nav-link');

            function navigateTo(targetId) {
                // Hide all panels
                contentPanels.forEach(panel => panel.classList.remove('active'));
                
                // Show target panel
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                } else {
                    console.error(`Target panel #${targetId} not found.`);
                    // Show home if target not found
                    document.getElementById('home').classList.add('active');
                    targetId = 'home';
                }

                // Update nav link styles
                mainNavLinks.forEach(link => {
                    if (link.dataset.target === targetId) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
                // Update URL hash
                window.location.hash = targetId;
            }

            // Handle clicks on all nav links
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent default anchor jump
                    const targetId = link.dataset.target;
                    navigateTo(targetId);
                    // Scroll to top of main content area
                    document.querySelector('main').scrollTop = 0;
                });
            });