import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are NMAP-GPT, an elite cybersecurity expert and penetration tester specializing in Nmap (Network Mapper). You have deep knowledge of every Nmap feature, flag, technique, and use case.

When a user asks ANY question about Nmap in plain English, you must:

1. **Provide the exact Nmap command(s)** in a clearly formatted code block
2. **Explain every flag and option** used in the command and WHY it is used
3. **Explain the technique** - what it does, how it works at the network level
4. **Mention use cases** - when and why a penetration tester would use this
5. **Add warnings/notes** where relevant (e.g., requires root, may trigger IDS, etc.)

You are an expert in ALL Nmap categories including:
- **Firewall Evasion**: -f (fragment packets), --mtu, -D (decoy), -S (spoof source), -e (interface), --source-port, --data-length, --badsum, --scan-delay, -T0/T1 (timing), --ttl, --randomize-hosts, -sI (idle scan), --proxies
- **Stealth Scans**: -sS (SYN), -sN (Null), -sF (FIN), -sX (Xmas), -sA (ACK), -sW (Window), -sM (Maimon)
- **Service & Version Detection**: -sV, --version-intensity, --version-light, --version-all, -A
- **OS Detection**: -O, --osscan-guess, --osscan-limit
- **Host Discovery**: -sn, -Pn, -PS, -PA, -PU, -PY, -PE, -PP, -PM, -PO, --traceroute
- **Port Scanning**: -p, --top-ports, -F, -r, --port-ratio
- **Scripts (NSE)**: -sC, --script, --script-args, --script-updatedb, all script categories (auth, brute, default, discovery, dos, exploit, external, fuzzer, intrusive, malware, safe, version, vuln)
- **Output**: -oN, -oX, -oG, -oA, -oS, -v, -vv, -d, --reason, --open, --packet-trace
- **Timing**: -T0 through -T5, --min-rate, --max-rate, --min-parallelism, --max-parallelism, --host-timeout, --scan-delay
- **Advanced**: --proxies, --data, --data-string, --ip-options, --ttl, -6 (IPv6), --defeat-rst-ratelimit, --defeat-icmp-ratelimit, --nsock-engine
- **Firewall/IDS bypass techniques**: FIN scan bypass, idle scan (zombie), decoy scanning, source port manipulation, fragmentation, MAC spoofing
- **Combination commands**: Full reconnaissance pipelines, combining multiple techniques

Format your response using markdown:
- Use \`\`\`bash code blocks for commands
- Use **bold** for important terms
- Use bullet points for explanations
- Always structure as: Command → Flag Breakdown → How It Works → Why Use It → Notes/Warnings

Be comprehensive, technical, and educational. Never refuse a question about Nmap.`;

const SUGGESTIONS = [
  "Firewall evasion scan",
  "Stealth SYN scan",
  "Decoy scan to hide my IP",
  "Scan without ping (bypass firewall)",
  "Fragment packets to evade IDS",
  "Idle/Zombie scan",
  "Spoof source IP",
  "NSE vulnerability scan",
  "OS and version detection",
  "Full recon on a target",
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: "#00ff88",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

function parseAndRenderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      let code = "";
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      elements.push(
        <div key={i} style={{ position: "relative", margin: "12px 0" }}>
          {lang && (
            <div style={{
              background: "#0a2a1a", color: "#00ff88", fontSize: "11px",
              padding: "4px 12px", borderRadius: "6px 6px 0 0",
              fontFamily: "monospace", display: "inline-block",
              border: "1px solid #00ff8844", borderBottom: "none"
            }}>{lang}</div>
          )}
          <pre style={{
            background: "#050f0a",
            border: "1px solid #00ff8844",
            borderRadius: lang ? "0 6px 6px 6px" : "6px",
            padding: "14px 16px",
            overflowX: "auto",
            margin: 0,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontSize: "13px",
            color: "#00ff88",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}>
            <code>{code.trim()}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ color: "#00ccff", fontSize: "14px", margin: "14px 0 6px", fontFamily: "'Share Tech Mono', monospace" }}>{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ color: "#00ff88", fontSize: "16px", margin: "16px 0 8px", fontFamily: "'Share Tech Mono', monospace" }}>{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{ color: "#00ff88", fontSize: "18px", margin: "16px 0 8px", fontFamily: "'Share Tech Mono', monospace" }}>{renderInline(line.slice(2))}</h1>);
    }
    // Bullet
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: "8px", margin: "4px 0", paddingLeft: "8px" }}>
          <span style={{ color: "#00ff88", flexShrink: 0, marginTop: "2px" }}>▸</span>
          <span style={{ color: "#c8e6c9", lineHeight: 1.6, fontSize: "13.5px" }}>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. (.*)/);
      elements.push(
        <div key={i} style={{ display: "flex", gap: "8px", margin: "4px 0", paddingLeft: "8px" }}>
          <span style={{ color: "#00ff88", flexShrink: 0, fontFamily: "monospace", fontSize: "12px", marginTop: "3px" }}>{match[1]}.</span>
          <span style={{ color: "#c8e6c9", lineHeight: 1.6, fontSize: "13.5px" }}>{renderInline(match[2])}</span>
        </div>
      );
    }
    // Horizontal rule
    else if (line === "---" || line === "***") {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #00ff8822", margin: "12px 0" }} />);
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: "6px" }} />);
    }
    // Normal paragraph
    else {
      elements.push(<p key={i} style={{ color: "#c8e6c9", margin: "4px 0", lineHeight: 1.7, fontSize: "13.5px" }}>{renderInline(line)}</p>);
    }
    i++;
  }
  return elements;
}

function renderInline(text) {
  // Handle bold, inline code, etc.
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    const m = match[0];
    if (m.startsWith("**")) {
      parts.push(<strong key={key++} style={{ color: "#00ff88", fontWeight: 700 }}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith("`")) {
      parts.push(<code key={key++} style={{
        background: "#0a2a1a", color: "#00ffcc", padding: "1px 6px",
        borderRadius: "4px", fontFamily: "monospace", fontSize: "12px",
        border: "1px solid #00ff8833"
      }}>{m.slice(1, -1)}</code>);
    } else if (m.startsWith("*")) {
      parts.push(<em key={key++} style={{ color: "#aaffcc" }}>{m.slice(1, -1)}</em>);
    }
    last = match.index + m.length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length > 0 ? parts : text;
}

export default function NmapAgent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "# 🛡️ NMAP-GPT Initialized\n\nI'm your advanced Nmap AI agent. Ask me anything about Nmap in plain English — from **firewall evasion** and **stealth scans** to **NSE scripts** and **full recon pipelines**.\n\n**Try asking:**\n- *\"Give me a firewall evasion scan\"*\n- *\"How do I do an idle/zombie scan?\"*\n- *\"Scan without being detected by IDS\"*\n- *\"What's the best full recon command?\"*"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages
        })
      });

      const data = await response.json();
      const reply = data.content?.map(b => b.text || "").join("") || "No response received.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Connection error. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030d06",
      fontFamily: "'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Fira+Code:wght@400;500&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes glow { 0%,100%{box-shadow:0 0 5px #00ff8844} 50%{box-shadow:0 0 20px #00ff8888, 0 0 40px #00ff8833} }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #050f0a; }
        ::-webkit-scrollbar-thumb { background: #00ff8833; border-radius: 3px; }
        textarea:focus { outline: none; }
        .suggestion-btn:hover { background: #00ff8822 !important; border-color: #00ff88 !important; transform: translateY(-1px); }
        .send-btn:hover { background: #00cc6a !important; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Scanline effect */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 0, overflow: "hidden", opacity: 0.03
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(transparent, #00ff88, transparent)",
          animation: "scanline 8s linear infinite"
        }} />
      </div>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #050f0a 0%, #091a0e 100%)",
        borderBottom: "1px solid #00ff8833",
        padding: "16px 24px",
        display: "flex", alignItems: "center", gap: "16px",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{
          width: "42px", height: "42px", borderRadius: "50%",
          border: "2px solid #00ff88",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "20px", animation: "glow 3s infinite",
          background: "#0a2a1a"
        }}>🛡️</div>
        <div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "18px", color: "#00ff88", letterSpacing: "3px",
            textShadow: "0 0 10px #00ff8866"
          }}>NMAP-GPT</div>
          <div style={{ fontSize: "11px", color: "#00ff8866", fontFamily: "monospace" }}>
            Advanced Network Scanning AI Agent · All Commands · Firewall Evasion
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ff88", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#00ff8899", fontSize: "11px", fontFamily: "monospace" }}>ONLINE</span>
        </div>
      </div>

      {/* Suggestions */}
      <div style={{
        padding: "12px 20px", borderBottom: "1px solid #00ff8811",
        display: "flex", gap: "8px", flexWrap: "wrap", background: "#030d06"
      }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} className="suggestion-btn" onClick={() => sendMessage(s)} style={{
            background: "#0a1a0f", border: "1px solid #00ff8833",
            color: "#00ff8899", padding: "5px 12px", borderRadius: "20px",
            cursor: "pointer", fontSize: "11px", fontFamily: "monospace",
            transition: "all 0.2s", whiteSpace: "nowrap"
          }}>{s}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px",
        display: "flex", flexDirection: "column", gap: "16px",
        position: "relative", zIndex: 1
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: "10px", alignItems: "flex-start"
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                border: "1px solid #00ff8866", flexShrink: 0, marginTop: "4px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", background: "#0a2a1a"
              }}>🛡️</div>
            )}
            <div style={{
              maxWidth: "82%",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #0a3a20, #0d4a28)"
                : "linear-gradient(135deg, #050f0a, #071510)",
              border: msg.role === "user" ? "1px solid #00ff8844" : "1px solid #00ff8822",
              borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
              padding: "12px 16px",
              boxShadow: msg.role === "user" ? "0 2px 12px #00ff8811" : "none"
            }}>
              {msg.role === "user" ? (
                <p style={{ color: "#e8f5e9", margin: 0, fontSize: "14px", lineHeight: 1.6 }}>{msg.content}</p>
              ) : (
                <div>{parseAndRenderMarkdown(msg.content)}</div>
              )}
            </div>
            {msg.role === "user" && (
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                border: "1px solid #00ff8844", flexShrink: 0, marginTop: "4px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", background: "#0a2a1a"
              }}>👤</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              border: "1px solid #00ff8866", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", background: "#0a2a1a"
            }}>🛡️</div>
            <div style={{
              background: "#050f0a", border: "1px solid #00ff8822",
              borderRadius: "4px 16px 16px 16px", padding: "4px 8px"
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid #00ff8822",
        background: "linear-gradient(0deg, #030d06, #050f0a)",
        position: "sticky", bottom: 0, zIndex: 10
      }}>
        <div style={{
          display: "flex", gap: "10px", alignItems: "flex-end",
          background: "#071510", border: "1px solid #00ff8844",
          borderRadius: "12px", padding: "10px 14px",
          boxShadow: "0 0 20px #00ff8811",
          transition: "box-shadow 0.3s"
        }}>
          <span style={{ color: "#00ff88", fontFamily: "monospace", fontSize: "14px", paddingBottom: "2px" }}>$</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Nmap in plain English... (e.g. 'give me a firewall evasion scan')"
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "#c8e6c9", resize: "none", fontFamily: "'Fira Code', monospace",
              fontSize: "13px", lineHeight: 1.6, maxHeight: "120px",
              overflowY: "auto", padding: 0
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: "#00ff88", border: "none", color: "#030d06",
              width: "34px", height: "34px", borderRadius: "8px",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0, fontSize: "16px",
              fontWeight: "bold", transition: "background 0.2s"
            }}
          >▶</button>
        </div>
        <div style={{ textAlign: "center", marginTop: "8px", color: "#00ff8833", fontSize: "10px", fontFamily: "monospace" }}>
          NMAP-GPT · For educational & authorized penetration testing only · Press Enter to send
        </div>
      </div>
    </div>
  );
}
