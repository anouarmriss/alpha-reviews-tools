import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import "./App.css";

function App() {
  // États de base
  const [clientName, setClientName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [language, setLanguage] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const qrRef = useRef(null);

  // Optimisation d'image et gestion du logo
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.match("image.*")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Création d'un canvas pour optimiser l'image
          const canvas = document.createElement("canvas");

          // Déterminer la taille optimale (max 150x150px pour économiser de l'espace)
          const MAX_SIZE = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Dessiner l'image optimisée
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir en format de haute qualité mais taille réduite
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

          setLogoPreview(optimizedDataUrl);
          setLogo(file);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Génération du lien de revue
  const generateReviewLink = () => {
    if (!clientName || !placeId) {
      alert(
        "Veuillez remplir les champs obligatoires: Nom de l'entreprise et ID Google Place"
      );
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const baseUrl = window.location.origin + "/review.html";
      const url = new URL(baseUrl);
      url.searchParams.append("name", encodeURIComponent(clientName.trim()));
      url.searchParams.append("place_id", placeId.trim());
      url.searchParams.append("lang", language);

      // Si un logo existe, l'ajouter en tant que paramètre base64
      if (logoPreview) {
        // Stocker la référence du logo dans localStorage pour éviter une URL trop longue
        localStorage.setItem("business_logo", logoPreview);
        url.searchParams.append("has_logo", "true");
      }

      setGeneratedLink(url.toString());
      setIsGenerated(true);
      setIsGenerating(false);
    }, 500);
  };

  // Téléchargement du QR code
  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const canvas = document.createElement("canvas");
    const size = 600;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    const qrCanvas = qrRef.current.querySelector("canvas");
    if (!qrCanvas) return;

    ctx.drawImage(
      qrCanvas,
      0,
      0,
      qrCanvas.width,
      qrCanvas.height,
      0,
      0,
      size,
      size
    );

    if (logoPreview) {
      const img = new Image();
      img.onload = () => {
        const logoSize = size * 0.22;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 1.8, 0, Math.PI * 2, true);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 1.8, 0, Math.PI * 2, true);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 5;
        ctx.stroke();

        finishDownload();
      };
      img.src = logoPreview;
    } else {
      finishDownload();
    }

    function finishDownload() {
      try {
        const dataUrl = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        const businessName = clientName.trim() || "qrcode";
        link.download = `${businessName.replace(/\s+/g, "-")}-qr.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Erreur lors de la génération de l'image QR code", err);
        alert("Une erreur est survenue lors de la création du QR code.");
      }
    }
  };

  // Génération du fichier HTML de revue
  const generateHTML = () => {
    const translations = {
      en: {
        title: "How was your experience?",
        subtitle: `Please rate your experience with ${clientName}`,
        feedbackTitle: "What could we improve?",
        feedbackPrompt: "Your feedback helps us serve you better",
        submitButton: "Submit",
        thankYou: "Thank you for your feedback!",
      },
      fr: {
        title: "Comment était votre expérience?",
        subtitle: `Veuillez évaluer votre expérience avec ${clientName}`,
        feedbackTitle: "Que pourrions-nous améliorer?",
        feedbackPrompt: "Vos commentaires nous aident à mieux vous servir",
        submitButton: "Soumettre",
        thankYou: "Merci pour vos commentaires!",
      },
      ar: {
        title: "كيف كانت تجربتك؟",
        subtitle: `يرجى تقييم تجربتك مع ${clientName}`,
        feedbackTitle: "ما الذي يمكننا تحسينه؟",
        feedbackPrompt: "تعليقاتك تساعدنا على خدمتك بشكل أفضل",
        submitButton: "إرسال",
        thankYou: "شكرا لك على ملاحظاتك!",
      },
    };

    const t = translations[language];
    const isRTL = language === "ar" ? 'dir="rtl"' : "";

    // S'assurer que le logo est inclus correctement dans la page de revue
    const logoHtml = logoPreview
      ? `<img src="${logoPreview}" alt="${clientName} Logo" class="business-logo">`
      : "";

    // Ajouter du JavaScript pour récupérer le logo du localStorage
    const logoScript = `
    // Essayer de récupérer le logo du localStorage si présent
    if (params.get('has_logo') === 'true') {
      try {
        const savedLogo = localStorage.getItem('business_logo');
        if (savedLogo) {
          const logoImg = document.createElement('img');
          logoImg.src = savedLogo;
          logoImg.alt = businessName + ' Logo';
          logoImg.className = 'business-logo';
          logoContainer.innerHTML = '';
          logoContainer.appendChild(logoImg);
        }
      } catch(e) {
        console.log('Impossible de récupérer le logo:', e);
      }
    }`;

    // Créer le contenu HTML avec styles condensés pour réduire la taille
    const htmlContent = `<!DOCTYPE html>
<html lang="${language}" ${isRTL}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${clientName} - ${t.title}</title>
    <style>
        :root{--primary-color:#4361ee;--primary-dark:#3a56d4;--accent-color:#ffb400;--text-color:#333;--text-light:#666;--background:#f8f9fa;--white:#fff;--shadow:rgba(0,0,0,0.1);--radius:15px;--transition:all 0.3s ease}*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:var(--background);color:var(--text-color);line-height:1.6;min-height:100vh;padding:20px 0;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;background:linear-gradient(135deg,#f5f7fa 0%,#e4e8f0 100%)}.container{width:92%;max-width:450px;margin:0 auto}.review-card{background-color:var(--white);border-radius:var(--radius);padding:35px 30px;box-shadow:0 15px 35px rgba(0,0,0,0.1),0 5px 15px rgba(0,0,0,0.07);text-align:center;position:relative;overflow:hidden;transition:transform 0.3s}.review-card:hover{transform:translateY(-5px)}.logo-container{margin-bottom:25px}.business-logo{width:90px;height:90px;object-fit:contain;border-radius:50%;margin:0 auto;box-shadow:0 5px 15px rgba(0,0,0,0.1);border:3px solid #fff;background-color:#fff;padding:3px}.logo-placeholder{width:90px;height:90px;background:linear-gradient(135deg,var(--primary-color) 0%,var(--primary-color) 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;color:var(--white);font-size:36px;font-weight:bold;box-shadow:0 5px 15px rgba(0,0,0,0.1);border:3px solid #fff}h1{color:var(--primary-color);font-size:24px;margin-bottom:10px;font-weight:700}.subtitle{color:var(--text-light);font-size:16px;margin-bottom:30px}.stars-container{margin:35px 0}.stars{display:flex;justify-content:center;gap:20px;position:relative}.star-wrapper{display:flex;flex-direction:column;align-items:center;position:relative}.star{font-size:48px;color:#ddd;cursor:pointer;transition:transform 0.3s,color 0.3s;user-select:none;-webkit-user-select:none;position:relative;filter:drop-shadow(0 0 2px rgba(0,0,0,0.1))}.star-number{font-size:12px;color:#888;margin-top:5px;font-weight:500}.star:hover,.star.active,.star.hover{color:var(--accent-color);transform:scale(1.15);filter:drop-shadow(0 0 5px rgba(255,180,0,0.4))}.star-wrapper:last-child .star{animation:attention 3s infinite}@keyframes attention{0%,100%{transform:scale(1)}85%{transform:scale(1)}90%{transform:scale(1.25)}95%{transform:scale(1.15)}}.star:hover::after,.star.active::after,.star.hover::after{content:'';position:absolute;top:50%;left:50%;width:100%;height:100%;background:radial-gradient(circle,rgba(255,180,0,0.6) 0%,rgba(255,180,0,0) 70%);transform:translate(-50%,-50%);z-index:-1;opacity:0.7;animation:glow 1.5s infinite alternate;pointer-events:none}@keyframes glow{from{opacity:0.5;width:90%;height:90%}to{opacity:0.8;width:130%;height:130%}}@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}.star.selected{animation:pulse 0.4s forwards}.feedback-form{display:none;margin-top:30px;animation:fadeIn 0.5s ease-out;background-color:#f9f9f9;padding:20px;border-radius:12px;border:1px solid #eee}.feedback-heading{color:var(--primary-color);font-size:20px;margin-bottom:8px;text-align:left}[dir="rtl"] .feedback-heading{text-align:right}.feedback-subtitle{color:var(--text-light);font-size:14px;margin-bottom:20px;text-align:left}[dir="rtl"] .feedback-subtitle{text-align:right}textarea{width:100%;height:120px;padding:15px;border:1px solid #ddd;border-radius:10px;font-size:16px;font-family:inherit;resize:none;margin-bottom:20px;transition:border-color 0.3s;box-shadow:inset 0 1px 3px rgba(0,0,0,0.05)}textarea:focus{outline:none;border-color:var(--primary-color);box-shadow:0 0 0 2px rgba(67,97,238,0.1)}button{background:linear-gradient(to right,var(--primary-color),var(--primary-dark));color:var(--white);border:none;border-radius:25px;padding:14px 0;width:60%;font-size:16px;font-weight:600;cursor:pointer;transition:var(--transition);-webkit-appearance:none;box-shadow:0 4px 10px rgba(67,97,238,0.3)}button:hover,button:active{background:linear-gradient(to right,var(--primary-dark),var(--primary-color));transform:translateY(-2px);box-shadow:0 6px 15px rgba(67,97,238,0.4)}.thank-you{display:none;margin:30px 0;animation:fadeIn 0.5s ease-out}.thank-you h2{color:var(--primary-color);margin-bottom:15px;font-size:24px}.thank-you p{color:var(--text-light);font-size:16px}.loader{display:none;width:40px;height:40px;margin:20px auto;border:4px solid rgba(67,97,238,0.1);border-radius:50%;border-top:4px solid var(--primary-color);animation:spin 1s linear infinite}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.wave{position:absolute;bottom:0;left:0;width:100%;height:100px;background:url('data:image/svg+xml;utf8,<svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg"><path fill="%234361ee" fill-opacity="0.05" d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,202.7C672,224,768,224,864,229.3C960,235,1056,245,1152,218.7C1248,192,1344,128,1392,96L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>');background-size:cover;background-repeat:no-repeat;z-index:-1}@media (max-width:380px){.stars{gap:15px}.star{font-size:40px}.star-number{font-size:10px}h1{font-size:20px}.subtitle{font-size:14px}}
    </style>
</head>
<body>
    <div class="container">
        <div class="review-card">
            <div class="wave"></div>
            
            <div class="logo-container" id="logo-container">
                ${logoHtml}
            </div>
            
            <h1 id="title">${t.title}</h1>
            <p class="subtitle" id="subtitle">${t.subtitle}</p>
            
            <div class="stars-container">
                <div class="stars">
                    <div class="star-wrapper">
                        <span class="star" data-value="1">★</span>
                        <span class="star-number">1</span>
                    </div>
                    <div class="star-wrapper">
                        <span class="star" data-value="2">★</span>
                        <span class="star-number">2</span>
                    </div>
                    <div class="star-wrapper">
                        <span class="star" data-value="3">★</span>
                        <span class="star-number">3</span>
                    </div>
                    <div class="star-wrapper">
                        <span class="star" data-value="4">★</span>
                        <span class="star-number">4</span>
                    </div>
                    <div class="star-wrapper">
                        <span class="star" data-value="5">★</span>
                        <span class="star-number">5</span>
                    </div>
                </div>
            </div>
            
            <div id="feedback-form" class="feedback-form">
                <h2 class="feedback-heading" id="feedback-heading">${t.feedbackTitle}</h2>
                <p class="feedback-subtitle" id="feedback-subtitle">${t.feedbackPrompt}</p>
                <textarea id="feedback-text" placeholder="Please share your thoughts..."></textarea>
                <button id="submit-feedback">${t.submitButton}</button>
            </div>
            
            <div class="loader" id="loader"></div>
            
            <div id="thank-you" class="thank-you">
                <h2 id="thank-you-title">${t.thankYou}</h2>
                <p id="thank-you-message">We appreciate your comments and will use them to improve our service.</p>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const params = new URLSearchParams(window.location.search);
            const businessName = params.get('name') ? decodeURIComponent(params.get('name')) : 'Business';
            const placeId = params.get('place_id') || '';
            const lang = params.get('lang') || 'en';
            
            if (lang === 'ar') {
                document.documentElement.dir = 'rtl';
                document.documentElement.lang = 'ar';
            } else {
                document.documentElement.dir = 'ltr';
                document.documentElement.lang = lang;
            }
            
            const logoContainer = document.getElementById('logo-container');
            
            ${logoScript}
            
            if (!logoContainer.querySelector('.business-logo')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'logo-placeholder';
                
                const initials = businessName
                    .split(' ')
                    .filter(word => word.length > 0)
                    .map(word => word[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                
                placeholder.textContent = initials;
                logoContainer.appendChild(placeholder);
            }
            
            const stars = document.querySelectorAll('.star');
            const feedbackForm = document.getElementById('feedback-form');
            const thankYouMessage = document.getElementById('thank-you');
            const loader = document.getElementById('loader');
            
            stars.forEach(star => {
                star.addEventListener('mouseover', function() {
                    const hoverRating = parseInt(this.getAttribute('data-value'));
                    
                    stars.forEach(s => {
                        const value = parseInt(s.getAttribute('data-value'));
                        if (value <= hoverRating) {
                            s.classList.add('hover');
                        } else {
                            s.classList.remove('hover');
                        }
                    });
                });
                
                star.addEventListener('mouseout', function() {
                    stars.forEach(s => {
                        s.classList.remove('hover');
                    });
                });
                
                star.addEventListener('click', function() {
                    const rating = parseInt(this.getAttribute('data-value'));
                    
                    this.classList.add('selected');
                    setTimeout(() => this.classList.remove('selected'), 400);
                    
                    stars.forEach(s => {
                        const value = parseInt(s.getAttribute('data-value'));
                        if (value <= rating) {
                            s.classList.add('active');
                        } else {
                            s.classList.remove('active');
                        }
                    });
                    
                    if (rating >= 4) {
                        setTimeout(() => {
                            window.location.href = \`https://search.google.com/local/writereview?placeid=\${placeId}\`;
                        }, 800);
                    } else {
                        setTimeout(() => {
                            feedbackForm.style.display = 'block';
                        }, 400);
                    }
                });
            });
            
            document.getElementById('submit-feedback').addEventListener('click', function() {
                const feedbackText = document.getElementById('feedback-text').value;
                
                if (!feedbackText.trim()) {
                    document.getElementById('feedback-text').style.borderColor = '#ff6b6b';
                    setTimeout(() => {
                        document.getElementById('feedback-text').style.borderColor = '#ddd';
                    }, 2000);
                    return;
                }
                
                feedbackForm.style.display = 'none';
                loader.style.display = 'block';
                
                const data = {
                    business: businessName,
                    feedback: feedbackText,
                    rating: document.querySelectorAll('.star.active').length,
                    timestamp: new Date().toISOString(),
                    language: lang
                };
                
                setTimeout(() => {
                    loader.style.display = 'none';
                    thankYouMessage.style.display = 'block';
                    console.log('Feedback submitted:', data);
                }, 1500);
            });
        });
    </script>
</body>
</html>`;

    // Créer blob et déclencher le téléchargement
    const blob = new Blob([htmlContent], { type: "text/html" });
    saveAs(blob, `${clientName.trim().replace(/\s+/g, "-")}-review.html`);
  };

  // Rendu de l'interface
  return (
    <div className="app-container">
      <header>
        <h1>Alpha Review Tool</h1>
        <p>
          Generate custom review pages with QR codes for better business reviews
        </p>
      </header>

      <main>
        <div className="generator-section">
          <div className="input-section">
            <h2>Generator Settings</h2>

            <div className="form-group">
              <label htmlFor="clientName">
                Business Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter business name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="placeId">
                Google Place ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="placeId"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Enter Google Maps Place ID"
                required
              />
              <div className="helper-text">
                <a
                  href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  How to find your Place ID
                </a>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="logo">Business Logo</label>
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleLogoUpload}
                className="file-input"
              />
              {logoPreview && (
                <div className="logo-preview">
                  <img src={logoPreview} alt="Logo Preview" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ar">Arabic (عربي)</option>
              </select>
            </div>

            <button
              className="generate-btn"
              onClick={generateReviewLink}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Review Page"}
            </button>
          </div>

          <div className="preview-section">
            <h2>Preview & Download</h2>

            {isGenerated ? (
              <div className="preview-content">
                <div className="qr-preview" ref={qrRef}>
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt={`${clientName} Logo`}
                      className="qr-logo"
                    />
                  )}
                  <div className="qr-business-name">{clientName}</div>
                  <QRCodeCanvas
                    value={generatedLink}
                    size={260}
                    level="H"
                    includeMargin={true}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    imageSettings={
                      logoPreview
                        ? {
                            src: logoPreview,
                            width: 50,
                            height: 50,
                            excavate: true,
                          }
                        : undefined
                    }
                    style={{
                      borderRadius: "5px",
                      boxShadow: "0 3px 10px rgba(0, 0, 0, 0.08)",
                      maxWidth: "100%",
                    }}
                  />
                  <p className="qr-scan-text">Scan to rate your experience</p>
                </div>

                <div className="generated-link">
                  <label>Generated Link:</label>
                  <div className="link-display">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      onClick={() => window.open(generatedLink, "_blank")}
                      style={{ cursor: "pointer" }}
                      title="Click to open preview in new tab"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        alert("Link copied!");
                      }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => window.open(generatedLink, "_blank")}
                      style={{ backgroundColor: "#4361ee" }}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                <div className="download-options">
                  <button onClick={downloadQRCode} className="download-btn">
                    Download QR Code
                  </button>
                  <button onClick={generateHTML} className="download-btn">
                    Download HTML Page
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-preview">
                <div className="empty-preview-content">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 6H5V10H9V6Z"
                      stroke="#cccccc"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 6H15V10H19V6Z"
                      stroke="#cccccc"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 16H5V20H9V16Z"
                      stroke="#cccccc"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 16H15V20H19V16Z"
                      stroke="#cccccc"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p>Fill in the fields and generate to see preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
