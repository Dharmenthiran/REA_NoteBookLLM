// storage.js - Local persistence and rich default seed data

const STORAGE_KEY = 'aetheria_notebooklm_data';
const SETTINGS_KEY = 'aetheria_notebooklm_settings';

// Default initial notebook with rich research data
const SEED_DATA = {
  activeNotebookId: 'nb-quantum-neuromorphic',
  notebooks: [
    {
      id: 'nb-quantum-neuromorphic',
      title: 'Quantum Computing & Neuromorphic AI',
      emoji: '⚡',
      createdAt: '2026-10-24T10:00:00Z',
      sources: [
        {
          id: 'src-1',
          title: 'Neuromorphic Spiking Architecture & Memristive Crossbars',
          type: 'pdf',
          dateAdded: '2026-10-24T10:05:00Z',
          active: true,
          wordCount: 1420,
          content: `Neuromorphic computing represents a transformative departure from conventional von Neumann architectures by emulating the biophysical dynamics of the mammalian brain. Biological nervous systems process, store, and compute information concurrently using massively parallel networks of interconnected neurons and adaptive synapses. In standard modern digital hardware, the physical separation of the central processing unit (CPU) and memory introduces the notorious "von Neumann bottleneck," consuming immense energy and inflicting significant latency during data transmission.

Neuromorphic architectures overcome this limitation through event-driven spiking neural networks (SNNs) and in-memory analog computing implemented via nanoscale memristive crossbar arrays. Memristors—resistors with non-volatile memory whose resistance depends on past electrical charge—serve as artificial electronic synapses capable of continuously adjusting synaptic weights according to Spike-Timing-Dependent Plasticity (STDP). 

Key empirical measurements across experimental neuromorphic chips such as Intel Loihi 2 and IBM TrueNorth demonstrate energy reductions ranging between 100x and 1000x relative to graphics processing units (GPUs) during real-time sensory pattern recognition and edge inferencing. Furthermore, because neurons communicate purely through asynchronous, discrete binary spikes rather than continuous numerical activations, power is only consumed during active action potentials, yielding idle quiescent power levels below 1 microwatt per core.

However, principal engineering hurdles remain. Analog memristor drift, cycle-to-cycle device variation, and thermal fluctuations impose stochastic noise on synaptic weights. Emerging algorithmic breakthroughs in backpropagation-through-time (BPTT) surrogates and hardware-aware training are mitigating these errors, paving the path toward low-power neuromorphic coprocessors in autonomous robotics and brain-computer interfaces.`
        },
        {
          id: 'src-2',
          title: 'Topological Quantum Error Correction & Majorana Fermions',
          type: 'text',
          dateAdded: '2026-10-24T10:15:00Z',
          active: true,
          wordCount: 1250,
          content: `Realizing practical quantum supremacy requires scaling quantum computers beyond the Noisy Intermediate-Scale Quantum (NISQ) era to fault-tolerant architectures. Physical qubits synthesized from superconducting transmon circuits or trapped ions remain extremely susceptible to environmental decoherence, acoustic phonon noise, and magnetic flux fluctuations, exhibiting coherence times on the order of tens to hundreds of microseconds.

Topological quantum computing offers an intrinsically protected paradigm. Instead of encoding fragile quantum states within isolated local quantum degrees of freedom, topological systems store quantum information non-locally within the braided trajectories of non-Abelian anyons, particularly Majorana zero modes (MZMs) engineered at the semiconductor-superconductor nanowire interfaces. Because local perturbation fields cannot alter global topological invariants, topological qubits possess inherent hardware-level protection against local phase and bit-flip errors.

Parallel to hardware topology, surface codes represent the dominant quantum error correction (QEC) scheme. By arranging physical qubits on a 2D square lattice with alternating syndrome measurements (plaquette and vertex operators), surface codes achieve an extraordinarily high fault-tolerance error threshold of approximately 1%. When the physical error rate per gate remains below this critical threshold, increasing the lattice code distance exponentially suppresses logical error rates.

Recent landmark experiments have demonstrated real-time non-destructive syndrome extraction and active error decoding using minimum-weight perfect matching (MWPM) algorithms running on sub-microsecond FPGA pipelines. The road forward combines surface-code stabilizer measurements with topological protection, potentially slashing the physical-to-logical qubit overhead from 1,000:1 down to 50:1.`
        },
        {
          id: 'src-3',
          title: 'Bio-Hybrid Organic Synapses in Next-Gen Autonomous Robotics',
          type: 'url',
          dateAdded: '2026-10-24T10:20:00Z',
          active: true,
          wordCount: 1180,
          content: `The synthesis of synthetic neuromorphic materials with biological tissue has given rise to the field of bio-hybrid organic electronics. Organic electrochemical transistors (OECTs) and conducting polymers such as PEDOT:PSS operate through volumetric ionic-electronic coupling, closely mimicking the ionic flux of biological neurotransmission in physiological electrolyte environments.

In bio-hybrid robotics, arrays of organic artificial synapses are interfaced with cultured mammalian cortical neurons or mechanoreceptive sensory nerves. Synaptic plasticity is modulated directly by neurotransmitters like dopamine and acetylcholine, allowing the robotic peripheral nervous system to exhibit associative Hebbian learning directly at the sensor-actuator boundary without central computational intervention.

Experimental implementations of soft biomimetic grippers embedded with bio-hybrid synapses demonstrate adaptive tactile pressure modulation. When encountering fragile objects, local ionic feedback dynamically adjusts grasping compliance within 4 milliseconds. This decentralized bio-inspired closed-loop reflex fundamentally circumvents the round-trip latency of cloud-tethered deep learning models.

Future integration targets the co-fabrication of bio-compatible organic synaptic arrays with low-power CMOS control circuitry, enabling long-term chronic neural implants and self-healing soft robotic appendages that adapt autonomously to continuous environmental damage.`
        }
      ],
      chatMessages: [
        {
          id: 'msg-seed-1',
          role: 'user',
          content: 'How do neuromorphic spiking networks compare to traditional computing architectures in terms of energy efficiency and the von Neumann bottleneck?'
        },
        {
          id: 'msg-seed-2',
          role: 'assistant',
          content: `Based on your uploaded sources, neuromorphic computing overcomes the classical **von Neumann bottleneck** by unifying memory and processing in an event-driven paradigm [1].

Key distinctions and mechanisms:
1. **Elimination of the Memory Wall**: In conventional computers, separating the CPU and RAM forces constant, energy-intensive data shuttling. Neuromorphic architectures use in-memory analog computing via **memristive crossbar arrays**, where artificial synapses perform computation directly where data is stored [1].
2. **Massive Energy Reductions**: Measured chips like Intel Loihi 2 and IBM TrueNorth exhibit **100x to 1000x lower energy consumption** than GPUs during real-time sensory pattern recognition [1].
3. **Event-Driven Spiking**: Unlike standard neural networks that compute continuous float values at every cycle, spiking neural networks (SNNs) communicate solely via discrete binary spikes. Power is consumed only during active action potentials, keeping quiescent idle power below **1 microwatt per core** [1].

The primary remaining challenges are analog device drift and thermal variations, which are actively being addressed by hardware-aware training algorithms [1].`,
          citations: [
            {
              id: 1,
              sourceId: 'src-1',
              sourceTitle: 'Neuromorphic Spiking Architecture & Memristive Crossbars',
              quote: 'In standard modern digital hardware, the physical separation of the central processing unit (CPU) and memory introduces the notorious "von Neumann bottleneck," consuming immense energy... Neuromorphic architectures overcome this limitation through event-driven spiking neural networks (SNNs) and in-memory analog computing implemented via nanoscale memristive crossbar arrays.',
              chunkIndex: 0
            }
          ]
        }
      ],
      notes: [
        {
          id: 'note-1',
          title: 'Key Synergies: Neuromorphic + Quantum Error Correction',
          content: 'Neuromorphic FPGA controllers could potentially execute sub-microsecond syndrome decoding for surface-code quantum error correction! The 1 microwatt quiescent power makes it ideal for cryogenic dilution refrigerator integration.',
          pinned: true,
          date: '2026-10-25T14:30:00Z'
        },
        {
          id: 'note-2',
          title: 'Bio-Hybrid Sensory Latency',
          content: 'OECT organic synapses achieve 4ms tactile pressure reflex at the robotic actuator boundary. No cloud roundtrip required.',
          pinned: false,
          date: '2026-10-25T16:45:00Z'
        }
      ],
      audioPodcast: {
        title: 'Deep Dive: Quantum & Neuromorphic Frontiers',
        totalDuration: 255, // 4m 15s
        focusPrompt: 'Focus on how neuromorphic systems and quantum error correction intersect',
        transcript: [
          { speaker: 'Alex', text: "Welcome back to the deep dive. Today we're looking at something genuinely wild: the convergence of neuromorphic computing, quantum error correction, and bio-hybrid robotics." },
          { speaker: 'Jordan', text: "Right! And what immediately struck me from these papers is how fundamentally all three fields are trying to solve the exact same wall: the limits of classical silicon." },
          { speaker: 'Alex', text: "Exactly. The first paper dives straight into the von Neumann bottleneck. In our current laptops and servers, the CPU has to constantly shuttle data back and forth from RAM, burning massive amounts of energy." },
          { speaker: 'Jordan', text: "And neuromorphic chips like Loihi 2 flip that entirely by computing in-memory using memristors. They consume 100 to 1,000 times less energy because they only fire when there's an actual spike—just like neurons in your brain!" },
          { speaker: 'Alex', text: "Now connect that with the second paper on topological quantum error correction. The biggest challenge in quantum computing is decoherence. Standard qubits die in microseconds unless you can constantly detect and fix errors." },
          { speaker: 'Jordan', text: "And that's where surface codes come in with that 1% error threshold! But think about it: decoding those errors requires ultra-fast sub-microsecond FPGA pipelines. Could neuromorphic spike-based decoders be the secret sauce to make fault-tolerant quantum computing feasible?" },
          { speaker: 'Alex', text: "That is the multi-billion dollar question. And as the third paper points out with organic synapses reacting in 4 milliseconds, we might soon have autonomous robots running decentralized bio-inspired intelligence without needing any cloud server at all." },
          { speaker: 'Jordan', text: "It's an astonishing glimpse into what computation looks like beyond the next decade." }
        ]
      }
    }
  ]
};

export const getAppData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading app data:', err);
    return SEED_DATA;
  }
};

export const saveAppData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving app data:', err);
  }
};

export const getActiveNotebook = () => {
  const data = getAppData();
  return data.notebooks.find(n => n.id === data.activeNotebookId) || data.notebooks[0];
};

export const updateActiveNotebook = (updater) => {
  const data = getAppData();
  const index = data.notebooks.findIndex(n => n.id === data.activeNotebookId);
  if (index !== -1) {
    updater(data.notebooks[index]);
    saveAppData(data);
  }
};

export const getSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        provider: 'builtin',
        apiKey: '',
        model: 'gemini-1.5-flash',
        host1VoiceIndex: 0,
        host2VoiceIndex: 1,
        theme: 'oceanic'
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.theme) parsed.theme = 'oceanic';
    return parsed;
  } catch (err) {
    return { provider: 'builtin', apiKey: '', theme: 'oceanic' };
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
};
