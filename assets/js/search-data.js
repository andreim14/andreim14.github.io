// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-code",
          title: "code",
          description: "Code I maintain in the open: a typed Redis ODM, and the research systems behind my papers.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "post-how-to-build-a-langgraph-rag-agent-with-persistent-memory-in-redis-beanis",
      
        title: "How to build a LangGraph RAG agent with persistent memory in Redis (Beanis)...",
      
      description: "A LangGraph agent that retrieves passages with Beanis vector search, keeps conversation history in Redis, and answers with an OpenAI model. Models, graph, nodes and entry point in complete Python.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/build-ai-agents-langgraph-beanis/";
        
      },
    },{id: "post-continual-pretraining-of-minerva-7b-an-italian-llm-data-recipes-16k-context-and-instruction-tuning-clic-it-2025",
      
        title: "Continual pretraining of Minerva-7B, an Italian LLM: data recipes, 16K context and instruction...",
      
      description: "We continually pretrained Minerva-7B on three data recipes (47.9B, 92B and 116B tokens) and extended its context from 4,096 to 16,384 tokens. Math data lifted GSM8K from 14.70 to 34.42, copyrighted books helped only on literary text, and the 16K model reached 25.9 METEOR on the new Italian INDAQA benchmark.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/continual-training-minerva-italian-llm/";
        
      },
    },{id: "post-vocabulary-adaptation-for-an-italian-llm-cutting-token-fertility-with-sava-naacl-2025-findings",
      
        title: "Vocabulary adaptation for an Italian LLM: cutting token fertility with SAVA (NAACL 2025...",
      
      description: "Swapping the tokenizer of Mistral-7B-v0.1 and Llama-3.1-8B for an Italian one cuts Italian token fertility by 25% (Mistral) and 16% (Llama) and shrinks Llama-3.1-8B from 8.03B to 7.25B parameters. With SAVA initialisation and 12B tokens of continual training, the adapted Mistral matches or beats the original on Italian benchmarks.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/vocabulary-adaptation-italian-llm-sava/";
        
      },
    },{id: "post-llm-oasis-a-large-scale-dataset-and-benchmark-for-end-to-end-factuality-evaluation-of-llm-text-computational-linguistics-2026",
      
        title: "LLM-Oasis: a large-scale dataset and benchmark for end-to-end factuality evaluation of LLM text...",
      
      description: "LLM-Oasis is built from 81,275 Wikipedia pages: 681,201 extracted claims and 81k pairs of factual and unfactual texts that differ by one subtle falsified claim. On its human-validated gold benchmark GPT-4o reaches 60.8% balanced accuracy zero-shot and 68.0% with retrieval; a 1B fine-tuned pipeline reaches 69.24%.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/llm-oasis-factuality-evaluation/";
        
      },
    },{id: "post-concept-pedia-and-concept-10k-test-your-vision-language-model-beyond-imagenet-emnlp-2025",
      
        title: "Concept-pedia and Concept-10k: test your vision-language model beyond ImageNet (EMNLP 2025)",
      
      description: "Concept-10k is a human-validated benchmark of 9,837 visual concepts in 28 semantic categories. SigLIP-SO400M scores 83.2% on ImageNet-1k and 40.3% on Concept-10k. How the dataset was built from Wikipedia and BabelNet, how to evaluate your own model on it in a few lines, and how to cite it.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/concept-pedia-emnlp-2025/";
        
      },
    },{id: "post-how-to-find-nearby-places-in-redis-with-python-a-restaurant-finder-with-beanis-geopoint",
      
        title: "How to find nearby places in Redis with Python: a restaurant finder with...",
      
      description: "Store restaurants with a GeoPoint in Redis using Beanis, query them by radius with GEORADIUS, and use Redis as a geo cache in front of PostgreSQL/PostGIS. Complete async Python code.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/building-restaurant-finder-redis-geopoints/";
        
      },
    },{id: "post-word-sense-linking-disambiguate-word-senses-in-raw-text-no-pre-marked-spans-findings-of-acl-2024",
      
        title: "Word Sense Linking: disambiguate word senses in raw text, no pre-marked spans (Findings...",
      
      description: "Word Sense Linking (WSL) finds which words in a raw text need disambiguating and links each to its WordNet sense, in one forward pass. 75.9 F1 on the fully annotated benchmark against 71.5 for the best WSD system adapted to the task. How it works, how to run it, and how to cite it.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/word-sense-linking-acl-2024/";
        
      },
    },{id: "post-agentic-rag-in-65-lines-langgraph-1-2-claude-and-redis-8-vector-sets",
      
        title: "Agentic RAG in 65 lines: LangGraph 1.2, Claude and Redis 8 vector sets...",
      
      description: "A docs assistant that searches, cites its sources and remembers the user, in one 65-line Python file: LangGraph 1.2 create_agent, Claude Opus 5.5, Beanis 0.3 on Redis 8 vector sets (no Redis Stack) and local fastembed embeddings.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/build-rag-50-lines-beanis-redis/";
        
      },
    },{id: "post-beanis-an-async-redis-odm-for-python-with-pydantic-models",
      
        title: "Beanis: an async Redis ODM for Python with Pydantic models",
      
      description: "Beanis maps Pydantic models to Redis hashes, keeps secondary indexes for you and gives you a Beanie-style async API. Install, define a model, insert, query by index, set TTLs.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/introducing-beanis/";
        
      },
    },{id: "news-word-sense-linking-presented-at-acl-2024-disambiguating-word-meaning-on-real-in-the-wild-text",
          title: 'Word Sense Linking presented at ACL 2024: disambiguating word meaning on real, in-the-wild...',
          description: "",
          section: "News",},{id: "news-released-beanis-a-typed-redis-odm-for-python-70-less-boilerplate-performance-within-8-of-raw-redis",
          title: 'Released Beanis, a typed Redis ODM for Python: ~70% less boilerplate, performance within...',
          description: "",
          section: "News",},{id: "news-conceptpedia-accepted-at-emnlp-2025-a-large-scale-cross-lingual-concept-resource-for-grounding-semantic-understanding",
          title: 'ConceptPedia accepted at EMNLP 2025: a large-scale, cross-lingual concept resource for grounding semantic...',
          description: "",
          section: "News",},{id: "news-building-syllotips-governed-agent-runtime-orchestration-model-context-protocol-tooling-and-agent-memory-that-keeps-reasoning-grounded-and-supervisable",
          title: 'Building Syllotips’ governed agent runtime: orchestration, Model Context Protocol tooling, and agent memory...',
          description: "",
          section: "News",},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%73%74%65%66%61%6E.%62%65%6A%67%75@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/andreim14", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/andrei-stefan-bejgu", "_blank");
        },
      },{
        id: 'social-researchgate',
        title: 'ResearchGate',
        section: 'Socials',
        handler: () => {
          window.open("https://www.researchgate.net/profile/Andrei-Bejgu/", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=N_eHzKAAAAAJ", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
