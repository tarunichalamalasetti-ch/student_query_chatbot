/**
 * TopGrade Internship Assistant - Client Interaction Script
 * Connects frontend UI to Flask backend /chat API
 * Handles two-column responsive layout, category selection, quick questions,
 * rich message formatting (auto-links, phones, emails), and typing indicators.
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const chatMessages = document.getElementById("chat-messages");
    const typingIndicator = document.getElementById("typing-indicator");
    const quickChips = document.getElementById("quick-chips");
    const clearChatBtn = document.getElementById("clear-chat-btn");
    const welcomeTime = document.getElementById("welcome-time");
    const categoryCards = document.querySelectorAll(".category-card");
    const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
    const supportSidebar = document.getElementById("support-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");

    // Initialize welcome timestamp
    if (welcomeTime) {
        welcomeTime.textContent = getCurrentTime();
    }

    // Set initial focus on input
    if (userInput && window.innerWidth > 860) {
        userInput.focus();
    }

    /**
     * Get current time formatted as 'hh:mm AM/PM'
     */
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strMinutes = minutes < 10 ? "0" + minutes : minutes;
        return `${hours}:${strMinutes} ${ampm}`;
    }

    /**
     * Escape HTML characters to prevent XSS
     */
    function escapeHTML(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Format bot message content:
     * - Auto-links URLs (https://...)
     * - Auto-links phone numbers
     * - Auto-links emails
     * - Converts newlines to paragraphs/breaks
     */
    function formatMessage(text) {
        if (!text) return "";
        let escaped = escapeHTML(text);

        // Auto-link URLs
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        escaped = escaped.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });

        // Auto-link Email Addresses
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        escaped = escaped.replace(emailRegex, (email) => {
            return `<a href="mailto:${email}">${email}</a>`;
        });

        // Auto-link Phone Numbers (Indian format +91 ...)
        const phoneRegex = /(\+91[\s\d-]{10,13})/g;
        escaped = escaped.replace(phoneRegex, (phone) => {
            const cleanPhone = phone.replace(/[\s-]/g, "");
            return `<a href="tel:${cleanPhone}">${phone}</a>`;
        });

        // Convert double newlines to paragraph breaks, single newlines to <br>
        const paragraphs = escaped.split(/\n\n+/);
        if (paragraphs.length > 1) {
            return paragraphs.map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
        }

        return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
    }

    /**
     * Smoothly scroll chat container to latest message
     */
    function scrollToBottom() {
        requestAnimationFrame(() => {
            if (chatMessages) {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: "smooth"
                });
            }
        });
    }

    /**
     * Append a message bubble to the chat container
     * @param {'user' | 'bot'} sender
     * @param {string} text
     * @param {boolean} isError
     */
    function appendMessage(sender, text, isError = false) {
        const messageRow = document.createElement("div");
        messageRow.className = `message-row ${sender}`;

        const isUser = sender === "user";
        const avatarHTML = isUser
            ? `<div class="message-avatar user-avatar" aria-hidden="true" title="You">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                   <circle cx="12" cy="7" r="4"></circle>
                 </svg>
               </div>`
            : `<div class="message-avatar bot-avatar" aria-hidden="true" title="TopGrade Assistant">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                   <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                 </svg>
               </div>`;

        const bubbleClass = isUser
            ? "user-bubble"
            : isError
            ? "bot-bubble error-bubble"
            : "bot-bubble";

        const contentHTML = isUser ? `<p>${escapeHTML(text)}</p>` : formatMessage(text);
        const timeHTML = getCurrentTime();

        messageRow.innerHTML = `
            ${avatarHTML}
            <div class="message-content-group">
                <div class="message-bubble ${bubbleClass}">
                    ${contentHTML}
                </div>
                <span class="message-time">${timeHTML}</span>
            </div>
        `;

        // Insert before typing indicator to maintain proper order
        chatMessages.insertBefore(messageRow, typingIndicator);
        scrollToBottom();
    }

    /**
     * Show/Hide the typing indicator animation
     */
    function setTyping(isTyping) {
        if (!typingIndicator) return;
        if (isTyping) {
            typingIndicator.style.display = "flex";
            scrollToBottom();
        } else {
            typingIndicator.style.display = "none";
        }
    }

    /**
     * Send user message to the backend via POST /chat
     */
    async function sendMessage(messageText) {
        const text = (messageText || userInput.value).trim();
        if (!text) return;

        // Close mobile drawer if open
        closeMobileSidebar();

        // Display user's question
        appendMessage("user", text);

        // Reset & disable input while waiting
        if (userInput) {
            userInput.value = "";
            userInput.disabled = true;
        }
        if (sendBtn) {
            sendBtn.disabled = true;
        }

        // Show typing indicator
        setTyping(true);

        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const data = await response.json();
            const botReply = data && data.response 
                ? data.response 
                : "I didn't receive a response. Please try again.";

            // Hide typing indicator before displaying bot message
            setTyping(false);
            appendMessage("bot", botReply);

        } catch (error) {
            console.error("Chat communication error:", error);
            setTyping(false);
            appendMessage(
                "bot",
                "⚠️ Sorry, I could not connect to the TopGrade support server. Please make sure the backend server is running and try again.",
                true
            );
        } finally {
            // Re-enable input controls
            if (userInput) {
                userInput.disabled = false;
                if (window.innerWidth > 860) {
                    userInput.focus();
                }
            }
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            scrollToBottom();
        }
    }

    // Form submission handler
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    // Enter key handler (Enter sends, Shift+Enter allowed)
    if (userInput) {
        userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Quick Chips handler
    if (quickChips) {
        quickChips.addEventListener("click", (e) => {
            const chip = e.target.closest(".quick-chip-btn");
            if (!chip) return;

            const query = chip.getAttribute("data-query");
            if (query) {
                sendMessage(query);
            }
        });
    }

    // Left Panel Category Cards handler
    categoryCards.forEach(card => {
        card.addEventListener("click", () => {
            // Remove active state from all cards
            categoryCards.forEach(c => c.classList.remove("active"));
            
            // Add active state to clicked card
            card.classList.add("active");

            // Extract query
            const query = card.getAttribute("data-query") || card.getAttribute("data-category");
            if (query) {
                sendMessage(query);
            }
        });
    });

    // Clear Chat Button handler
    if (clearChatBtn) {
        clearChatBtn.addEventListener("click", () => {
            // Confirmation or direct clear
            const dynamicMessages = chatMessages.querySelectorAll(
                ".message-row:not(.welcome-row):not(#typing-indicator)"
            );
            dynamicMessages.forEach(msg => msg.remove());

            // Remove active states on categories
            categoryCards.forEach(c => c.classList.remove("active"));

            // Reset input
            if (userInput) {
                userInput.value = "";
                userInput.disabled = false;
                userInput.focus();
            }
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            setTyping(false);
            scrollToBottom();
        });
    }

    // Mobile Sidebar Drawer Handlers
    function openMobileSidebar() {
        if (supportSidebar) supportSidebar.classList.add("open");
        if (sidebarBackdrop) sidebarBackdrop.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeMobileSidebar() {
        if (supportSidebar) supportSidebar.classList.remove("open");
        if (sidebarBackdrop) sidebarBackdrop.classList.remove("open");
        document.body.style.overflow = "";
    }

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener("click", () => {
            if (supportSidebar && supportSidebar.classList.contains("open")) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener("click", closeMobileSidebar);
    }
});
