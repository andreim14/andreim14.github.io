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
  },{id: "nav-blog",
          title: "blog",
          description: "Thoughts on AI, NLP, and building practical ML systems",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-publications",
          title: "publications",
          description: "Peer-reviewed work on factuality, meaning, and multilingual NLP. Most recent first.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-open-source",
          title: "open source",
          description: "Code I maintain in the open: a typed Redis ODM, and the research systems behind my papers.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "post-stateful-ai-agents-with-langgraph-and-beanis-rag-with-persistent-memory-on-redis",
      
        title: "Stateful AI Agents with LangGraph and Beanis: RAG with Persistent Memory on Redis...",
      
      description: "A tutorial on building a stateful RAG agent with LangGraph for orchestration and Beanis for persistent memory and vector search, all backed by Redis, in about 200 lines of Python.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/build-ai-agents-langgraph-beanis/";
        
      },
    },{id: "post-concept-pedia-a-multimodal-concept-dataset-and-benchmark-beyond-imagenet-emnlp-2025",
      
        title: "Concept-pedia: A Multimodal Concept Dataset and Benchmark Beyond ImageNet (EMNLP 2025)",
      
      description: "Concept-pedia is a wide-coverage, semantically-annotated multimodal dataset of 165K+ visual concepts built on BabelNet, with the Concept-10k benchmark and SigLIP models on Hugging Face for evaluating vision-language models beyond ImageNet.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/concept-pedia-emnlp-2025/";
        
      },
    },{id: "post-redis-geo-spatial-cache-build-a-restaurant-finder-with-beanis-and-postgresql",
      
        title: "Redis Geo-Spatial Cache: Build a Restaurant Finder with Beanis and PostgreSQL",
      
      description: "How to use Redis (via the Beanis ODM) as a geo-spatial cache in front of PostgreSQL/PostGIS, with OpenStreetMap data, to serve nearby-restaurant queries in about 12ms.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/building-restaurant-finder-redis-geopoints/";
        
      },
    },{id: "post-word-sense-linking-word-sense-disambiguation-on-real-text-acl-2024",
      
        title: "Word Sense Linking: Word Sense Disambiguation on Real Text (ACL 2024)",
      
      description: "Word Sense Linking (WSL) is a model that finds the ambiguous words in raw text and links each to its correct WordNet sense, no pre-marked spans or candidate lists required. Published at ACL 2024 (Findings) by Babelscape and Sapienza. Includes the model, results, and Python usage.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/word-sense-linking-acl-2024/";
        
      },
    },{id: "post-rag-with-redis-and-beanis-build-vector-search-in-50-lines-no-separate-vector-db",
      
        title: "RAG with Redis and Beanis: Build Vector Search in ~50 Lines (No Separate...",
      
      description: "Build a RAG pipeline in about 50 lines of Python using Redis vector search and the Beanis ODM, without adding a separate vector database like Pinecone.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/build-rag-50-lines-beanis-redis/";
        
      },
    },{id: "post-beanis-a-typed-redis-odm-for-python-with-pydantic-v2",
      
        title: "Beanis: A Typed Redis ODM for Python with Pydantic v2",
      
      description: "Beanis is an async, Pydantic v2 object-document mapper for vanilla Redis. It cuts serialization boilerplate by about 70% and stays within roughly 8% of raw redis-py performance.",
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
