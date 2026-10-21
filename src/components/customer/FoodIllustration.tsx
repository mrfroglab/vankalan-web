import React from 'react';

interface FoodIllustrationProps {
  kind: 'noodle' | 'soup' | 'rice' | 'toast' | 'tea' | 'coffee' | 'orange';
  className?: string;
}

export function FoodIllustration({ kind, className = 'w-full h-full' }: FoodIllustrationProps) {
  if (['tea', 'coffee', 'orange'].includes(kind)) {
    const fill = kind === 'coffee' ? '#896342' : kind === 'orange' ? '#e9a333' : '#bb762e';
    const topFill = kind === 'coffee' ? '#c89e6c' : '#d69b49';
    return (
      <svg
        viewBox="0 0 300 200"
        className={className}
        role="img"
        aria-label={`Ilustrasi minuman ${kind}`}
      >
        <ellipse cx="150" cy="168" rx="66" ry="12" fill="#594f3620" />
        <path d="M104 40h92l-12 119q-35 16-69 0Z" fill="#fdf8e7" stroke="#dbd8c5" strokeWidth="3" />
        <path d="M109 65h82l-12 91q-31 10-59 0Z" fill={fill} />
        <ellipse cx="150" cy="66" rx="41" ry="9" fill={topFill} />
        <path d="m166 91 7-72 20-6" stroke="#284f40" strokeWidth="7" fill="none" />
        <path d="m121 82 18-2 3 17-18 3zm30 22 17 1-1 18-18-2zm-25 22 16 1-1 16-16-2" fill="#ffefd988" />
        <path d="m117 56 8 93" stroke="white" opacity=".45" strokeWidth="4" />
      </svg>
    );
  }

  if (kind === 'toast') {
    return (
      <svg
        viewBox="0 0 300 200"
        className={className}
        role="img"
        aria-label="Ilustrasi roti bakar"
      >
        <ellipse cx="150" cy="125" rx="112" ry="50" fill="#e9e5ce" />
        <ellipse cx="150" cy="119" rx="101" ry="44" fill="#fdfbf0" />
        <g transform="rotate(-13 150 100)">
          <path d="M75 72q-10-22 10-27h110q23 9 8 27v66H75Z" fill="#c17f3d" />
          <path d="M83 71q-7-15 6-18h102q13 6 4 18v58H83Z" fill="#eec788" />
          <path
            d="m84 73 110 55M84 91l75 37m-74-19 36 19m0-75 74 38m-37-37 37 19"
            stroke="#714127"
            strokeWidth="8"
          />
          <path d="M139 53v76" stroke="#f9e0ac" strokeWidth="4" />
        </g>
      </svg>
    );
  }

  // Noodle, soup, rice
  const noodles = Array.from({ length: 12 }, (_, i) => (
    <path
      key={i}
      d={`M${68 + i * 3} ${75 + i * 4}q20 -20 40 0t40 0t40 0`}
      stroke={i % 2 ? '#deaa48' : '#efcc70'}
      strokeWidth="5"
      fill="none"
    />
  ));

  return (
    <svg
      viewBox="0 0 300 200"
      className={className}
      role="img"
      aria-label="Ilustrasi menu makanan warmindo"
    >
      <defs>
        <linearGradient id="bowl" x2="0" y2="1">
          <stop stopColor="#faf4d9" />
          <stop offset="1" stopColor="#ddd3ae" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="162" rx="101" ry="15" fill="#5a4a2820" />
      <path d="M41 94q7 80 109 82 102-2 109-82" fill="url(#bowl)" />
      <ellipse cx="150" cy="92" rx="110" ry="57" fill="#fdf9e8" />
      <ellipse
        cx="150"
        cy="94"
        rx="98"
        ry="45"
        fill={kind === 'soup' ? '#b77e3b' : kind === 'rice' ? '#e6d7ac' : '#bd9248'}
      />
      {kind === 'rice' ? (
        <>
          <ellipse cx="136" cy="91" rx="66" ry="37" fill="#e8d5a3" />
          <path
            d="m86 90 12-4m12-10 9 4m-18 22 10-3m8 16 10-5m-2-20 10 3m-2-25 12 4m3 35 8-4m1-17 10 2"
            stroke="#fff1cc"
            strokeWidth="4"
          />
        </>
      ) : (
        noodles
      )}
      <path d="m73 65 25-20 16 15-23 16m93 40 26-19 15 12-25 22" fill="#4f8048" />
      <path d="m72 104 19 10 7-14m104-42-18 14 18 9" fill="#8bad50" />
      <ellipse cx="174" cy="78" rx="34" ry="25" fill="#fff8dc" transform="rotate(-16 174 78)" />
      <ellipse cx="176" cy="76" rx="17" ry="14" fill="#eeac32" />
      <ellipse cx="171" cy="72" rx="7" ry="4" fill="#ffd460" />
      <path d="m106 60 7 5m18 44 7 3m-45-9 7 1m64 20 5-5m-16-57 5-5" stroke="#6e482d" strokeWidth="4" />
      <path d="m213 33-76 107m85-101-72 107" stroke="#755136" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
