// Everything the site says lives here, so editing copy never means touching
// the terminal or rendering code.

export const PERSON = {
  name: "Cyrus Nilforooshan",
  short: "Cyrus Nil",
  legal: "Taha",
  handle: "cnil-git",
  roles: ["embedded engineer", "full stack developer", "biophile", "compiler hacker", "plant parent"],
  location: "Austin, TX",
  school: "UT Austin",
};

/** Set to an address to show an email row on the contact page and in `contact`. */
export const EMAIL: string | null = "cyrus.nilfo@gmail.com";

export const LINKS = {
  github: "https://github.com/cnil-git",
  baja: "https://github.com/longhorn-baja-racing",
  bajaSite: "https://longhornbajaracing.com",
  frc: "https://github.com/10014Rebellion",
  source: "https://github.com/cnil-git/cnildev-website",
};

export type Visibility = "public" | "private" | "planned";

export interface Project {
  slug: string;
  name: string;
  pitch: string;
  body: string;
  points: string[];
  stack: string[];
  role: string;
  when: string;
  /** Last activity, shown in the ls -l listing. */
  date: string;
  visibility: Visibility;
  url?: string;
  /** Internal route to open instead of an external link. */
  page?: string;
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    slug: "monstera-lang",
    name: "Monstera Lang",
    pitch: "A safe-by-default systems language for embedded targets, and its compiler.",
    body:
      "A language where every allocation, check, and dynamic dispatch is visible in the source, and nothing that fails is ever undefined behavior. Co-designed with one other developer; I own the middle and back end of the compiler: MIR, the memory-safety checker, the optimizer, the backends, and embedded targets.",
    points: [
      "Rust workspace of 22 crates with forward-only dependencies enforced in CI",
      "SSA MIR with explicit safety checks the optimizer can hoist or remove",
      "C, Cranelift, and LLVM backends; Cortex-M0+/M4F and ESP32-C3/C6 first",
      "Early development: architecture and design in place, compiler not yet compiling",
    ],
    stack: ["Rust", "LLVM", "Cranelift", "Z3", "Cortex-M", "RISC-V"],
    role: "co-creator, middle + back end",
    when: "2026 - now",
    date: "Nov 2026",
    visibility: "private",
    page: "/monstera",
    featured: true,
  },
  {
    slug: "lbr-firmware",
    name: "LBR Vehicle Firmware",
    pitch: "Distributed CAN-bus data acquisition and telemetry for a Baja SAE race car.",
    body:
      "Eleven ESP32 nodes each own a slice of the car (IMU, powertrain, driver inputs, temperatures, strain, four wheel hubs) and publish schema-driven frames on one CAN bus. A central node keeps the shared clock, writes a crash-recoverable, CRC-checked log to microSD, and streams live telemetry over LoRa, WiFi, BLE, and USB.",
    points: [
      "CAN time sync 10x per second; sampling locked to that clock so bus latency never becomes measurement error",
      "Bus budget checked in tests: 43% of 500 kbit/s planned against a 50% ceiling",
      "Firmware updates over CAN through the central node, two OTA slots per node",
      "Host tests under ASan and UBSan, plus a car simulator that runs the exact code that gets flashed",
    ],
    stack: ["C", "ESP-IDF", "FreeRTOS", "CAN", "LoRa", "CMake", "Python"],
    role: "founding developer",
    when: "Aug 2026 - now",
    date: "Nov 2026",
    visibility: "public",
    url: "https://github.com/longhorn-baja-racing/firmware",
    featured: true,
  },
  {
    slug: "custom-dyno",
    name: "LBR Dyno Software",
    pitch: "Data acquisition and control for the team's CVT and shock dynamometers.",
    body:
      "One codebase drives two rigs. The CVT dyno measures engine and secondary RPM, CVT ratio, absorber torque, and power, and runs speed-hold, sweep, and road-load tests. The shock dyno runs force-velocity tests and fits dual-rate spring curves. A Pico 2 handles sensing, PID control, and safety; an ESP32-S3 serves the browser UI.",
    points: [
      "Portable C11 core (filters, PID, RPM measurement, curve fitting) tested on the host",
      "Physics simulators for both dynos speak the same serial protocol as the firmware",
      "Every calibration, limit, and gain is a runtime parameter while the mechanics settle",
    ],
    stack: ["C11", "Pico SDK", "ESP-IDF", "PID", "Python", "HTML/JS"],
    role: "sole developer",
    when: "Oct 2026 - now",
    date: "Nov 2026",
    visibility: "private",
  },
  {
    slug: "lidar-backpack",
    name: "LiDAR Backpack",
    pitch: "A wearable rig that maps a dirt course in 3D by walking it once.",
    body:
      "Walk the track wearing a Livox Mid-360 and an RTK GNSS receiver. An offline pipeline runs LiDAR-inertial odometry, a pose graph with RTK factors and loop closures, and ground segmentation, then exports georeferenced elevation, slope, and roughness maps for the car.",
    points: [
      "Targeting 10 cm RMSE or better, horizontal and vertical",
      "Back end validated on synthetic data, with a simulator and nightly CI",
    ],
    stack: ["ROS 2", "Python", "GTSAM", "Open3D", "Docker", "RTK GNSS"],
    role: "sole developer",
    when: "Oct 2026",
    date: "Oct 2026",
    visibility: "private",
  },
  {
    slug: "c3rberus",
    name: "C3RBERUS",
    pitch: "Competition robot code for FRC Team 10014 REBELLION, 2026 season.",
    body:
      "Command-based Java robot with swerve drive, AprilTag vision, autonomous routines, an intake, shooter, and climber. My work centered on drive tuning, auto-align, shoot-while-moving, autos, sensors and soft limits, and a lot of competition-day tuning.",
    points: ["Second-largest contributor, roughly a third of 543 commits"],
    stack: ["Java", "WPILib", "AdvantageKit", "Phoenix 6", "PathPlanner", "PhotonVision"],
    role: "core programmer",
    when: "Jan - Apr 2026",
    date: "Apr 2026",
    visibility: "public",
    url: "https://github.com/10014Rebellion/2026-C3RBERUS-main",
  },
  {
    slug: "rebellion-template",
    name: "Rebellion Template",
    pitch: "The reusable base every REBELLION robot project starts from.",
    body:
      "A self-contained library of swerve, controls, telemetry, and simulation utilities, with Javadocs published automatically.",
    points: [],
    stack: ["Java", "WPILib", "AdvantageKit"],
    role: "contributor",
    when: "2025 - 2026",
    date: "Jan 2026",
    visibility: "public",
    url: "https://github.com/10014Rebellion/rebellion-template",
  },
  {
    slug: "treasury-tracker",
    name: "Treasury Tracker",
    pitch: "Purchasing and finance system for university racing teams.",
    body:
      "Follows every part purchase from request through approval, purchase, shipping, and storage, with role-based approvals, separation of duties, receipts, reconciliation, and a tamper-evident audit log.",
    points: [],
    stack: ["Next.js", "React", "TypeScript", "Supabase", "Postgres"],
    role: "sole developer",
    when: "Oct 2026 - now",
    date: "Nov 2026",
    visibility: "private",
  },
  {
    slug: "lbr-cad-tools",
    name: "LBR CAD Tools",
    pitch: "A SolidWorks add-in to automate repetitive CAD work and rule checks.",
    body:
      "Planned: batch export, part numbering, a rule-book mounting-tab generator, an ordered tube notcher, and a live suspension-geometry monitor.",
    points: [],
    stack: ["C#", ".NET", "SolidWorks API"],
    role: "author",
    when: "planning",
    date: "Nov 2026",
    visibility: "planned",
    url: "https://github.com/longhorn-baja-racing/lbr-cad-tools",
  },
];

export const STACK: Record<string, string[]> = {
  languages: ["C", "C++", "Rust", "Python", "Java", "TypeScript"],
  embedded: ["ESP-IDF", "FreeRTOS", "Pico SDK", "CAN", "LoRa", "I2C / SPI"],
  systems: ["LLVM", "Cranelift", "ROS 2", "CMake", "sanitizers"],
  web: ["Next.js", "React", "Supabase", "Postgres", "Vite"],
  daily: ["CachyOS Linux", "zsh", "neovim", "git"],
};

export const TIMELINE: { when: string; what: string }[] = [
  { when: "2025", what: "Join FRC Team 10014 REBELLION; start contributing to the shared robot library" },
  { when: "2026.01", what: "Core programmer on C3RBERUS, the 2026 competition robot" },
  { when: "2026.08", what: "Firmware captain at Longhorn Baja Racing, UT Austin; start the vehicle firmware" },
  { when: "2026.10", what: "Dyno software, LiDAR backpack, and the team treasury system" },
  { when: "2026.11", what: "Start Monstera Lang" },
];

export const PLANTS: { name: string; latin: string; note: string }[] = [
  {
    name: "Monstera",
    latin: "Monstera deliciosa",
    note: "The namesake. New leaves unroll solid, then split and open as the plant matures.",
  },
];

export const FORTUNES: string[] = [
  "Monstera leaves split so wind and light can pass through. Good firmware leaves room too.",
  "A trap is not undefined behavior. A dead plant is not a mystery. Both leave evidence.",
  "Water when the top inch is dry. Flash when the tests are green.",
  "Fenestrations: the holes in a monstera leaf. Also what happens to a schedule near competition.",
  "Aerial roots are a monstera reaching for support. Ask for code review the same way.",
  "Plants grow toward the light. Bugs grow toward the deadline.",
  "Every allocation should be visible. So should every new leaf.",
  "The best time to write tests was before the bug. The second best time is now.",
  "Rotate your plants a quarter turn each week. Rotate your logs too.",
  "There is no garbage collector in the garden. Only compost.",
];

/** ASCII monstera from the GitHub profile. Characters map to logo colors. */
export const ASCII_LEAF = String.raw`                        ############
                    #####################
                ###########################
             #############################
            #############################
            ###########################          ##
     ###     ########################        #######
    ######      ###################      ###########
   #########       ###############   #############
  ############        ###########  #############       :::
 ################       ####################         ::::::
  ##################      ###############         ::::::::::
     ##########################:#######         ::::::::::::
        #######################:#####        :::::::::::::::
             #################::####     ::::::::::::::::::%
####               ###########::#####::::::::::::::::::%%%%%
 ##########           #######:::########::::::::%%%%%%%%%%%
  ##############        #####:::#################%%%%%%%%%
  ###########################:::############      %%%%%%%%
    ::::::::::###############:::########         %%%%%%%
     ::::::::::::############:::#####       %%%%%%%%%%%
       ::::::::::::::#######::::########%%%%%%%%%%%%%
          ::::::::::::::####::::######%%%%%%%%%%%%%
             :::::::::::::##::::####%%%%%%%%%%%%
                  :::::::::#::::###%%%%%%%%
                            ::::###
                             :::#`;
