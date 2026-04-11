/* ═══════════════════════════════════════════════════════════════
   HELYX — Research Assistant Chatbot
   Client-side keyword-matched support bot.
   STRICT POLICY: Never implies human consumption, dosages,
   administration routes, or side effects.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Product Knowledge Base ────────────────────────────────
    const PRODUCTS = {
        dihexa: {
            name: 'Dihexa',
            size: '10mg',
            price: '$64.99',
            category: 'Neuropeptide',
            purity: '≥98%',
            form: 'Lyophilized Powder',
            desc: 'Hexapeptide analog of angiotensin IV studied for its role in hepatocyte growth factor (HGF) signaling and synaptic connectivity in cognitive research models.',
            storage: '-20°C, desiccated',
            cas: '5765-44-4 (analog)',
            mw: '507.64 g/mol',
        },
        dsip: {
            name: 'DSIP',
            size: '10mg',
            price: '$54.99',
            category: 'Neuropeptide',
            purity: '≥98%',
            form: 'Lyophilized Powder',
            desc: 'Delta sleep-inducing peptide investigated for its modulatory effects on sleep architecture, stress-response pathways, and neuroendocrine regulation.',
            storage: '-20°C, desiccated',
            cas: '62568-57-4',
            mw: '848.82 g/mol',
        },
        'pe-22-28': {
            name: 'PE-22-28',
            size: '10mg',
            price: '$59.99',
            category: 'Neuropeptide',
            purity: '≥98%',
            form: 'Lyophilized Powder',
            desc: 'Heptapeptide fragment derived from proenkephalin, researched for neuroprotective properties and BDNF modulation.',
            storage: '-20°C, desiccated',
            mw: '729.83 g/mol',
        },
        cerebrolysin: {
            name: 'Cerebrolysin',
            size: '10mg',
            price: '$79.99',
            category: 'Neuropeptide',
            purity: '≥98%',
            form: 'Lyophilized Powder',
            desc: 'Neuropeptide preparation derived from porcine brain proteins, researched for neurotrophic factor modulation, synaptic plasticity, and neuroprotection in neurodegeneration models.',
            storage: '-20°C, desiccated',
            cas: '12656-61-0',
            mw: '<10 kDa peptide fragments',
        },
        selank: {
            name: 'Selank',
            size: '10mg',
            price: '$49.99',
            category: 'Neuropeptide',
            purity: '≥98%',
            form: 'Lyophilized Powder',
            desc: 'Synthetic analog of the immunomodulatory peptide tuftsin, researched for anxiolytic activity, cognitive enhancement, and immune system regulation.',
            storage: '-20°C, desiccated',
            cas: '129954-34-3',
            mw: '751.87 g/mol',
        },
        semax: {
            name: 'Semax',
            size: '10mg',
            price: '$49.99',
            category: 'Neuropeptide',
            purity: '≥98%',
            form: 'Lyophilized Powder',
            desc: 'Synthetic ACTH(4-7) analog with Pro-Gly-Pro extension, studied for nootropic effects, neuroprotection, and BDNF upregulation.',
            storage: '-20°C, desiccated',
            cas: '80714-61-0',
            mw: '813.93 g/mol',
        },
    };

    // ── BLOCKED topics (human consumption / dosage) ──────────
    const BLOCKED_PATTERNS = [
        /\b(dose|doses|dosage|dosing|dosages)\b/i,
        /\b(inject|injection|injecting|injections|subcutaneous|intramuscular|intranasal|intravenous|sublingual|oral|topical)\b/i,
        /\bhow\s+(much|many)\s+(should|do|can|to)\s+(i|you|we|someone|a person)\b/i,
        /\b(take|taking|consume|consuming|consumption|ingest|ingesting|swallow|drink|eat)\b/i,
        /\b(human use|personal use|self.?administer|self.?experiment|on myself|on humans|on animals|on people|on patients)\b/i,
        /\b(side ?effects?|adverse|reactions?|risks?|dangerous|safe to use|safe for|safety profile)\b/i,
        /\b(stack|stacking|combine with|cycle|cycling|protocol|regimen)\b/i,
        /\b(mg per|mcg per|iu per|units per|per day|per week|daily|twice daily|weekly)\b/i,
        /\b(reconstitut|bacteriostatic|bac water|sterile water|mixing|dilut)\b/i,
        /\b(body ?weight|body ?mass|kg|lbs|pounds)\b/i,
        /\b(treat|cure|heal|remedy|therapy|therapeutic|clinical use|medical)\b/i,
        /\b(will it help|can it help|does it work for|benefits for me|results|effects on me)\b/i,
        /\b(experience|felt|feeling|how does it feel)\b/i,
        /\b(weight ?loss|muscle|anti.?aging|sleep better|feel better|anxiety|depression|pain|inflammation)\b/i,
        /\b(prescription|doctor|physician|patient)\b/i,
    ];

    const BLOCKED_RESPONSE = `I appreciate the question, but I'm only able to provide information about our products for <strong>in-vitro and laboratory research purposes</strong>.\n\nI cannot provide guidance on dosages, administration, human/animal use, or therapeutic applications. All Helyx products are sold strictly as research compounds — <strong>not for human or animal consumption</strong>.\n\nIf you have questions about product specifications, purity, storage, or ordering, I'm happy to help!`;

    // ── Response matching ─────────────────────────────────────
    function getResponse(input) {
        const q = input.toLowerCase().trim();

        // 1) ALWAYS check blocked patterns first
        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(q)) {
                return { text: BLOCKED_RESPONSE };
            }
        }

        // 2) Greetings
        if (/^(hi|hey|hello|sup|yo|howdy|greetings|what'?s up)/i.test(q)) {
            return {
                text: `Hey there! 👋 I'm the Helyx research assistant. I can help with:\n\n• <strong>Product info</strong> — specs, purity, pricing\n• <strong>Orders & shipping</strong>\n• <strong>Payment methods</strong>\n• <strong>Company info</strong>\n\nWhat can I help you with?`,
                quickReplies: ['Product catalog', 'Shipping info', 'Payment methods', 'About Helyx'],
            };
        }

        // 3) Product-specific queries
        for (const [key, product] of Object.entries(PRODUCTS)) {
            if (!product) continue;
            const nameRegex = new RegExp('\\b' + product.name.replace('+', '\\+').replace('-', '[-\\s]?') + '\\b', 'i');
            if (nameRegex.test(q) || q.includes(key)) {
                return {
                    text: `<strong>${product.name} (${product.size})</strong> — ${product.price}\n\n${product.desc}\n\n• <strong>Purity:</strong> ${product.purity}\n• <strong>Form:</strong> ${product.form}\n• <strong>Storage:</strong> ${product.storage}\n• <strong>Mol. Weight:</strong> ${product.mw}${product.cas ? '\n• <strong>CAS:</strong> ' + product.cas : ''}\n\n<a href="products.html">View on catalog →</a>`,
                };
            }
        }

        // 4) Product catalog / list
        if (/\b(product|catalog|peptide|what do you (sell|have|offer)|all products|inventory|lineup|list)\b/i.test(q)) {
            const list = Object.values(PRODUCTS)
                .filter(Boolean)
                .filter((p, i, arr) => arr.indexOf(p) === i) // dedupe
                .map(p => `• <strong>${p.name}</strong> ${p.size} — ${p.price}`)
                .join('\n');
            return {
                text: `Here's our current catalog:\n\n${list}\n\nAll products are <strong>≥98% purity</strong>, lyophilized powder, for research use only.\n\n<a href="products.html">Browse full catalog →</a>`,
                quickReplies: ['Tell me about Dihexa', 'Tell me about Cerebrolysin', 'Shipping info'],
            };
        }

        // 5) Pricing
        if (/\b(price|pricing|cost|how much|expensive|cheap|affordable|discount|coupon|promo)\b/i.test(q)) {
            const list = Object.values(PRODUCTS)
                .filter(Boolean)
                .filter((p, i, arr) => arr.indexOf(p) === i)
                .map(p => `• ${p.name} ${p.size} — <strong>${p.price}</strong>`)
                .join('\n');
            return {
                text: `Current pricing:\n\n${list}\n\nOrders over <strong>$200 ship free</strong>. We don't currently have coupon codes, but all prices include CoA documentation.\n\n<a href="products.html">View catalog →</a>`,
            };
        }

        // 6) Shipping
        if (/\b(ship|shipping|delivery|deliver|tracking|track|how long|arrival|arrive|transit|fedex|ups|usps)\b/i.test(q)) {
            return {
                text: `<strong>Shipping Info:</strong>\n\n• Orders are shipped within <strong>1–2 business days</strong>\n• Standard shipping: <strong>$12.99</strong>\n• <strong>Free shipping</strong> on orders over $200\n• Currently shipping within the <strong>United States</strong>\n• Tracking number provided via email once shipped\n• Peptides are shipped in temperature-stable packaging`,
                quickReplies: ['Payment methods', 'Return policy', 'Product catalog'],
            };
        }

        // 7) Payment methods
        if (/\b(pay|payment|checkout|credit|debit|card|visa|mastercard|crypto|bitcoin|btc|eth|usdt|usdc|how to order|how do i buy)\b/i.test(q)) {
            return {
                text: `<strong>Payment Methods:</strong>\n\nWe accept:\n• 💳 <strong>Credit / Debit cards</strong> (Visa, Mastercard)\n• ₿ <strong>Bitcoin (BTC)</strong>\n• ⟠ <strong>Ethereum (ETH)</strong>\n• ₮ <strong>Tether (USDT)</strong>\n• $ <strong>USD Coin (USDC)</strong>\n\nAll payments are processed through our <strong>secure payment portal</strong>. Your card details never touch our servers.\n\n<a href="checkout.html">Go to checkout →</a>`,
            };
        }

        // 8) Returns / refunds
        if (/\b(return|refund|money back|exchange|cancel|cancellation)\b/i.test(q)) {
            return {
                text: `Due to the nature of research compounds, we generally <strong>cannot accept returns</strong> once shipped, as we can't verify storage or handling conditions.\n\nHowever, if you receive a damaged or incorrect product, please contact us and we'll make it right.\n\nAll products ship with a <strong>Certificate of Analysis (CoA)</strong> verifying purity and identity.`,
            };
        }

        // 9) Purity / quality / CoA
        if (/\b(purity|pure|quality|coa|certificate|analysis|hplc|mass spec|testing|tested|third.?party|lab.?tested)\b/i.test(q)) {
            return {
                text: `<strong>Quality & Purity:</strong>\n\n• All peptides are <strong>≥98% purity</strong> (HPLC-verified)\n• Cerebrolysin is <strong>≥98% purity</strong>\n• Every batch comes with a <strong>Certificate of Analysis (CoA)</strong>\n• Testing includes HPLC purity analysis and mass spectrometry (MS) identity confirmation\n• Manufactured under strict quality control protocols\n\n<a href="lab.html">Learn more about our lab →</a>`,
                quickReplies: ['Product catalog', 'Storage info'],
            };
        }

        // 10) Storage
        if (/\b(storage|store|storing|keep|refrigerat|freez|temperature|stability|shelf life|expir)\b/i.test(q)) {
            return {
                text: `<strong>Storage Guidelines:</strong>\n\n• All peptides should be stored at <strong>-20°C</strong> (standard lab freezer)\n• Keep <strong>desiccated</strong> (dry) — avoid moisture exposure\n• Protect from light and repeated freeze-thaw cycles\n• Unopened vials have a shelf life of <strong>24+ months</strong> when stored properly\n• Once reconstituted for research, use within the timeframe appropriate for your experimental protocol`,
            };
        }

        // 11) About / company
        if (/\b(about|who are|company|helyx|your team|your lab|mission|founded|background)\b/i.test(q)) {
            return {
                text: `<strong>About Helyx:</strong>\n\nHelyx is a research-focused supplier of high-purity peptides for <strong>laboratory and in-vitro use only</strong>. We're committed to:\n\n• Providing the highest purity research compounds\n• Full transparency with Certificates of Analysis\n• Fast, reliable shipping\n• Supporting the scientific research community\n\n<a href="about.html">Learn more about us →</a>`,
                quickReplies: ['Product catalog', 'Lab info'],
            };
        }

        // 12) Lab
        if (/\b(lab|laboratory|facility|manufacturing|made|synthesis|synthesiz)\b/i.test(q)) {
            return {
                text: `Our peptides are manufactured under strict quality control protocols with comprehensive analytical testing at every stage.\n\nEach product undergoes <strong>HPLC purity analysis</strong> and <strong>mass spectrometry</strong> identity confirmation before release.\n\n<a href="lab.html">View our lab page →</a>`,
            };
        }

        // 13) Research use / disclaimer
        if (/\b(research|in.?vitro|lab use|disclaimer|legal|not for human|for humans)\b/i.test(q)) {
            return {
                text: `<strong>⚠️ Important Disclaimer:</strong>\n\nAll Helyx products are for <strong>laboratory research and in-vitro use only</strong>.\n\n• <strong>Not for human or animal consumption</strong>\n• Not intended to diagnose, treat, cure, or prevent any disease\n• Must be handled by qualified research personnel\n• Purchasers must confirm they are 21+ and acknowledge research-only use\n\nThis applies to all products in our catalog without exception.`,
            };
        }

        // 14) Contact / support
        if (/\b(contact|support|email|reach|help|talk to|human|representative|phone|call)\b/i.test(q)) {
            return {
                text: `For additional support beyond what I can help with, you can reach our team at:\n\n📧 <strong>support@helyx.us</strong>\n\nWe typically respond within <strong>24 hours</strong> on business days.\n\nIs there anything else I can help you with?`,
                quickReplies: ['Product catalog', 'Shipping info', 'Payment methods'],
            };
        }

        // 15) Thank you / bye
        if (/\b(thanks|thank you|thx|bye|goodbye|see ya|later|cheers)\b/i.test(q)) {
            return {
                text: `You're welcome! If you need anything else, I'm always here. Happy researching! 🔬`,
            };
        }

        // 16) Account / login
        if (/\b(account|login|log in|sign up|register|password|forgot)\b/i.test(q)) {
            return {
                text: `You can manage your account here:\n\n• <a href="login.html">Log in →</a>\n• <a href="login.html">Create an account →</a>\n• <a href="forgot-password.html">Forgot password →</a>\n\nAn account lets you track orders and speeds up checkout.`,
            };
        }

        // 17) Order status
        if (/\b(order status|my order|where.?s my|tracking number|when will|order number)\b/i.test(q)) {
            return {
                text: `To check your order status:\n\n1. Check your email for a shipping confirmation with tracking\n2. Log into your <a href="account.html">account page</a> for order history\n3. If you paid via crypto, your order is confirmed once the transaction is verified on-chain\n\nIf you need help with a specific order, email us at <strong>support@helyx.us</strong> with your order number.`,
            };
        }

        // 18) Peptide general question
        if (/\b(what is a peptide|what are peptides|peptide definition)\b/i.test(q)) {
            return {
                text: `Peptides are short chains of amino acids (typically 2–50 residues) linked by peptide bonds. They serve as important tools in <strong>biochemistry and molecular biology research</strong>.\n\nHelyx specializes in high-purity synthetic peptides for in-vitro research applications. All our products come with analytical documentation.\n\n<a href="learn.html">Learn more →</a>`,
            };
        }

        // 19) Fallback
        return {
            text: `I'm not sure I understand that question. I can help with:\n\n• <strong>Product information</strong> — specs, purity, pricing\n• <strong>Orders & shipping</strong>\n• <strong>Payment methods</strong>\n• <strong>Company & lab info</strong>\n\nTry asking about a specific topic, or type <strong>"products"</strong> to see our catalog.\n\n<em>Note: I cannot provide information about dosages, human/animal use, or therapeutic applications.</em>`,
            quickReplies: ['Product catalog', 'Shipping info', 'Payment methods', 'About Helyx'],
        };
    }

    // ── Sanitize HTML (basic) ─────────────────────────────────
    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ── Build Widget DOM ──────────────────────────────────────
    function buildChatbot() {
        // Toggle button
        const toggle = document.createElement('button');
        toggle.className = 'chatbot-toggle';
        toggle.setAttribute('aria-label', 'Open chat');
        toggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span class="chatbot-toggle__dot"></span>`;

        // Chat window
        const chat = document.createElement('div');
        chat.className = 'chatbot';
        chat.innerHTML = `
            <div class="chatbot__header">
                <div class="chatbot__avatar">🧬</div>
                <div class="chatbot__header-info">
                    <div class="chatbot__header-name">Helyx Assistant</div>
                    <div class="chatbot__header-status">Online</div>
                </div>
                <button class="chatbot__close" aria-label="Close chat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="chatbot__messages" id="chatbot-messages"></div>
            <div class="chatbot__input-area">
                <input type="text" class="chatbot__input" id="chatbot-input" placeholder="Ask about products, shipping..." maxlength="300" autocomplete="off">
                <button class="chatbot__send" id="chatbot-send" aria-label="Send" disabled>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>
            <div class="chatbot__disclaimer">All products are for laboratory research only — not for human or animal consumption.</div>`;

        document.body.appendChild(toggle);
        document.body.appendChild(chat);

        return { toggle, chat };
    }

    // ── Message rendering ─────────────────────────────────────
    function addMessage(container, text, sender, quickReplies) {
        const msg = document.createElement('div');
        msg.className = `chatbot__msg chatbot__msg--${sender}`;
        // Bot messages can have basic HTML; user messages are escaped
        msg.innerHTML = sender === 'bot' ? text.replace(/\n/g, '<br>') : esc(text);
        container.appendChild(msg);

        // Quick replies (bot only)
        if (quickReplies && quickReplies.length) {
            const wrap = document.createElement('div');
            wrap.className = 'chatbot__quick-replies';
            quickReplies.forEach(label => {
                const btn = document.createElement('button');
                btn.className = 'chatbot__quick-btn';
                btn.textContent = label;
                btn.addEventListener('click', () => {
                    // Remove all quick-reply rows
                    container.querySelectorAll('.chatbot__quick-replies').forEach(el => el.remove());
                    handleUserInput(label);
                });
                wrap.appendChild(btn);
            });
            container.appendChild(wrap);
        }

        container.scrollTop = container.scrollHeight;
    }

    function showTyping(container) {
        const t = document.createElement('div');
        t.className = 'chatbot__typing';
        t.id = 'chatbot-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        container.appendChild(t);
        container.scrollTop = container.scrollHeight;
        return t;
    }

    // ── Main init ─────────────────────────────────────────────
    function initChatbot() {
        const { toggle, chat } = buildChatbot();
        const messages = chat.querySelector('#chatbot-messages');
        const input = chat.querySelector('#chatbot-input');
        const sendBtn = chat.querySelector('#chatbot-send');
        let isOpen = false;

        // Welcome message on first open
        let welcomed = false;

        function openChat() {
            isOpen = true;
            chat.classList.add('chatbot--visible');
            toggle.classList.add('chatbot-toggle--open');
            input.focus();
            if (!welcomed) {
                welcomed = true;
                setTimeout(() => {
                    addMessage(messages,
                        `Welcome to Helyx! 🧬 I'm your research assistant.\n\nI can help with <strong>product specs</strong>, <strong>pricing</strong>, <strong>shipping</strong>, and <strong>order questions</strong>.\n\n<em>All products are for laboratory research use only.</em>`,
                        'bot',
                        ['Product catalog', 'Shipping info', 'Payment methods']
                    );
                }, 300);
            }
        }

        function closeChat() {
            isOpen = false;
            chat.classList.remove('chatbot--visible');
            toggle.classList.remove('chatbot-toggle--open');
        }

        toggle.addEventListener('click', () => isOpen ? closeChat() : openChat());
        chat.querySelector('.chatbot__close').addEventListener('click', closeChat);

        // Send handler
        function handleUserInput(text) {
            const trimmed = text.trim();
            if (!trimmed) return;

            // Remove existing quick replies
            messages.querySelectorAll('.chatbot__quick-replies').forEach(el => el.remove());

            addMessage(messages, trimmed, 'user');
            input.value = '';
            sendBtn.disabled = true;

            // Typing indicator
            const typing = showTyping(messages);

            // Simulate brief delay
            const delay = 400 + Math.random() * 600;
            setTimeout(() => {
                typing.remove();
                const resp = getResponse(trimmed);
                addMessage(messages, resp.text, 'bot', resp.quickReplies);
            }, delay);
        }

        sendBtn.addEventListener('click', () => handleUserInput(input.value));

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserInput(input.value);
            }
        });

        input.addEventListener('input', () => {
            sendBtn.disabled = !input.value.trim();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) closeChat();
        });

        // Expose for external use if needed
        window.HelyChatbot = { open: openChat, close: closeChat };
    }

    // ── Boot ──────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
