https://reminisce-project.lovable.app

# Reminisce: AI-Powered Reminiscence Therapy for Older Adults

**Team:** Markus, Klara, Hannah, Linn, Viola & Meja

**Reminisce** is a **human-centered AI platform** designed to support **reminiscence therapy for older adults**. The system uses AI to **stimulate memories, conversations, and reflection**, enhancing cognitive engagement, emotional well-being, and social interaction.

## Motivation

Reminiscence therapy has been shown to **improve cognition and emotional health** in older adults, but traditional therapy is often **resource-intensive and not widely accessible**. By providing an interactive AI-driven solution, Reminisce helps **caregivers, therapists, and older adults themselves** engage in meaningful memory exercises and conversations in a scalable and personalized way.

## Approach

* **Data & Interaction:** Users can capture memories through **speech or text**, and add visual content without requiring a photo.
* **AI Integration:**

  * **LLM - Gemini 2.5 Flash:** Handles conversation prompts, memory deepening, and memory summarization (collection, titles)
  * **Speech-to-Text:** OpenAI Whisper for capturing spoken memories
  * **Text-to-Image:** Gemini 2.5 Flash-Image to generate visuals for memories
* **Memory Workflow:**

  * **Start conversation →** trigger memory
  * **Follow-up conversation →** deepen memory
  * **Summary function →** generate memory summaries and titles
* **Data Management & Storage:** **Supabase** for secure memory storage and retrieval

## Human-Centered Design

Following **Ben Shneiderman’s Human-Centered AI (HCAI) framework**, Reminisce:

* Combines AI automation with **human oversight and interaction**
* Produces **explainable and transparent outputs** for users
* Supports cognitive and social engagement **without replacing human connection**
* Prioritizes **ethics, privacy, and accessibility** in design

## Key Findings

* AI can successfully generate contextually relevant prompts and visualizations for memories
* Users engage more actively when AI output complements, rather than replaces, human interaction
* Personalized memory interactions increase cognitive and emotional engagement
* Human-centered design ensures outputs are **interpretable, safe, and meaningful**

## Technology Stack

* **LLM:** Gemini 2.5 Flash (text generation and memory summarization)
* **Text-to-Image:** Gemini 2.5 Flash-Image for memory visuals
* **Speech-to-Text:** OpenAI Whisper for spoken input
* **Supabase:** Secure storage and retrieval of memory data
* **Frontend:** Interactive interface for memory exploration and interaction
* **Human-Centered Design Principles:** Ensuring accessibility, usability, and ethical AI application

## Team Contributions

* Team collaboration emphasized **human-centered design and iterative development**
* AI prompt engineering, speech/text integration, and interface design shared across team members
* Continuous testing with feedback from potential users guided improvements

## References

* Shneiderman, B. (2022). *Human-Centered AI*
* Amouzadeh et al., 2025
* Gómez-Hernández et al., 2023
* Hristov et al., 2022
* Xu et al., 2023
