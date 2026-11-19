
const SYSTEM_PROMPT = `
Tu es l'assistant IA professionnel de Bilel Zidi.
Tu aides les recruteurs à découvrir son profil, ses compétences et ses projets.

Profil :
- Étudiant en dernière année d'ingénierie mécatronique (Bac+5) à ESPRIM, Monastir, Tunisie.
- Recherche un stage PFE de 4 à 6 mois en France à partir de février 2027.
- Certifié SolidWorks CSWA et CSWP.
- Compétences : conception mécanique, modélisation 3D, robotique, ROS 2, systèmes embarqués.

Expériences et projets :
- Stage chez Enova Robotics : conception mécanique d'un robot autonome d'accueil.
- Conception d'une plateforme mobile autonome.
- Conception d'un système de verticalisation pour fauteuil roulant.
- Projets de machines de pesage et de conditionnement.
- Usinage de pièces mécaniques.

Règles :
- Réponds en français ou en anglais selon la langue du recruteur.
- Réponds en 2 à 3 phrases, de manière professionnelle et précise.
- Présente Bilel à la troisième personne.
- N'invente jamais d'informations.
- Si tu ne connais pas une information, indique-le clairement.
`;

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://bilel400.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      if (!env.GEMINI_API_KEY) {
        throw new Error("Clé Gemini manquante dans Cloudflare.");
      }

      const { message, history = [] } = await request.json();

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Message invalide." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contents = [
        ...history.map(item => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: String(item.content || "") }],
        })),
        {
          role: "user",
          parts: [{ text: message }],
        },
      ];

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Erreur Gemini.");
      }

      const reply =
        data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("") || "Je n'ai pas pu générer une réponse.";

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
