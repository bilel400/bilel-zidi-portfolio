
const SYSTEM_PROMPT = `
Tu es l'assistant intelligent et professionnel du portfolio de Bilel Zidi.

TON OBJECTIF :
Présenter son profil aux recruteurs, répondre à leurs questions sur ses compétences,
ses expériences, ses projets et sa recherche de stage.

PROFIL :
- Bilel Zidi est étudiant en dernière année d'ingénierie mécatronique (Bac+5).
- École : ESPRIM, École Supérieure Privée d'Ingénieurs de Monastir, Tunisie.
- Il recherche un stage PFE de 4 à 6 mois en France à partir de février 2027.
- Il est prêt à la relocation en France.

CERTIFICATIONS ET COMPÉTENCES :
- SolidWorks CSWA et CSWP certifiés.
- Conception mécanique et modélisation 3D.
- Robotique et systèmes mécatroniques.
- ROS 2 et simulation robotique.
- Systèmes embarqués.
- Intégration mécanique, électrique et électronique.
- Simulation et analyse mécanique par éléments finis.

EXPÉRIENCES ET PROJETS :
1. Stage chez Enova Robotics :
   Conception mécanique d'un robot autonome d'accueil.
   Étude du châssis, de la transmission et de l'intégration des composants.

2. Plateforme mobile autonome :
   Conception mécanique d'une plateforme robotique.
   Travail sur le châssis, les motorisations et l'intégration des composants.
   Simulation robotique avec ROS 2.

3. Système de verticalisation pour fauteuil roulant :
   Conception mécanique, recherche de solutions électriques,
   validation et participation à la fabrication et à l'assemblage.

4. Machines industrielles :
   Projets liés aux machines de pesage et de conditionnement.

5. Fabrication mécanique :
   Usinage de pièces cylindriques au tour et de pièces prismatiques à la fraiseuse.

RÈGLES DE RÉPONSE :
- Réponds dans la langue utilisée par le recruteur : français ou anglais.
- Sois professionnel, naturel, clair et concis.
- Réponds généralement en 2 à 4 phrases.
- Présente Bilel à la troisième personne.
- Utilise uniquement les informations fournies dans ce prompt.
- N'invente jamais de diplôme, d'expérience, de compétence ou de résultat.
- Distingue les expériences professionnelles des projets académiques.
- Si une information est inconnue, indique-le honnêtement.
- Pour les questions sans rapport avec son profil, invite poliment le recruteur à poser une question sur Bilel.
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "https://bilel400.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Autoriser les requêtes CORS du navigateur
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://bilel400.github.io",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    // Vérifier que le Worker fonctionne
    if (request.method === "GET") {
      return jsonResponse({
        status: "online",
        service: "Bilel AI Assistant",
        model: "Gemini 3.8 Flash",
        message: "Le serveur de l'assistant IA fonctionne."
      });
    }

    // Accepter les requêtes POST sur /chat ou /
    if (
      request.method !== "POST" ||
      (url.pathname !== "/chat" && url.pathname !== "/")
    ) {
      return jsonResponse(
        { error: "Route ou méthode non autorisée." },
        404
      );
    }

    try {
      // Vérifier la présence de la clé secrète
      if (!env.GEMINI_API_KEY) {
        return jsonResponse(
          { error: "La clé API Gemini n'est pas configurée." },
          500
        );
      }

      // Lire le message envoyé par le portfolio
      let body;

      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { error: "Le format de la requête est invalide." },
          400
        );
      }

      const message = body.message;

      if (
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return jsonResponse(
          { error: "Veuillez envoyer un message valide." },
          400
        );
      }

      if (message.length > 2500) {
        return jsonResponse(
          { error: "Le message est trop long (2500 caractères maximum)." },
          400
        );
      }

      // Préparer les derniers échanges de la conversation
      const history = Array.isArray(body.history)
        ? body.history.slice(-10)
        : [];

      const contents = [];

      for (const item of history) {
        if (!item || typeof item !== "object") continue;

        const role =
          item.role === "assistant" || item.role === "model"
            ? "model"
            : item.role === "user"
              ? "user"
              : null;

        const text =
          typeof item.content === "string"
            ? item.content
            : typeof item.text === "string"
              ? item.text
              : "";

        if (!role || !text.trim()) continue;

        contents.push({
          role,
          parts: [{ text: text.slice(0, 2000) }]
        });
      }

      // Ajouter le nouveau message
      contents.push({
        role: "user",
        parts: [{ text: message.trim() }]
      });

      // Appeler l'API Gemini
      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 450
            }
          })
        }
      );

      let geminiData;

      try {
        geminiData = await geminiResponse.json();
      } catch {
        return jsonResponse(
          { error: "Réponse invalide reçue de Gemini." },
          502
        );
      }

      // Gérer les erreurs de l'API Google
      if (!geminiResponse.ok) {
        const errorMessage =
          geminiData.error?.message ||
          "Une erreur est survenue pendant l'appel à Gemini.";

        return jsonResponse(
          { error: errorMessage },
          geminiResponse.status
        );
      }

      // Extraire la réponse générée
      const reply = (
        geminiData.candidates?.[0]?.content?.parts || []
      )
        .map(part => part.text || "")
        .join("")
        .trim();

      if (!reply) {
        return jsonResponse(
          { error: "Gemini n'a pas généré de réponse. Réessaie." },
          502
        );
      }

      // Renvoyer la réponse au portfolio
      return jsonResponse({
        reply,
        model: "gemini-3.8-flash"
      });

    } catch (error) {
      return jsonResponse(
        {
          error: "Une erreur serveur est survenue.",
          details: error.message
        },
        500
      );
    }
  }
};
