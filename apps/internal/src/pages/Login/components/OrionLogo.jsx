import '../../../styles/pages/orionlogo.scss';
const OrionLogo = () => {
  return (
    <div className="orion-flight">
        <svg
          className="orion-logo"
          viewBox="0 0 25 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Orion flying logo"
        >
          <g className="orion-bird">
            <path
              className="orion-wing orion-wing-top"
              d="M12.4363 13.1099C10.9476 8.50919 1.75994 10.9689 3.58693 0C6.44151 5.03454 15.9801 1.43412 18.2781 9.56406L12.4363 13.1099Z"
              fill="url(#paint0_linear_9816_20832)"
            />

            <path
              className="orion-wing orion-wing-bottom"
              d="M12.1066 9.38273C9.44398 14.2691 8.10151 19.2257 2.83203 20.2765C7.87145 21.1365 16.5619 20.8449 18.2417 14.3607C19.7957 8.36198 22.2915 6.92591 24.76 6.68706C20.4577 3.02229 14.769 4.49638 12.1066 9.38273Z"
              fill="url(#paint1_linear_9816_20832)"
            />

            <path
              className="orion-body"
              d="M0 2.74609C3.67728 6.63413 14.7739 2.94401 17.7328 9.79679C20.5747 16.3786 14.5 22.1647 2.83601 20.2647C7.8246 20.1271 12.3161 18.1949 10.6354 14.4345C8.66208 10.02 0 14.8557 0 2.74609Z"
              fill="url(#paint2_linear_9816_20832)"
            />
          </g>

          <defs>
            <linearGradient
              id="paint0_linear_9816_20832"
              x1="-1.12706"
              y1="1.97806"
              x2="18.6064"
              y2="11.4007"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#10DAF9" />
              <stop offset="0.79" stopColor="#1D77B6" />
              <stop offset="1" stopColor="#0D3C75" />
            </linearGradient>

            <linearGradient
              id="paint1_linear_9816_20832"
              x1="25.3089"
              y1="5.08329"
              x2="1.00016"
              y2="22.3914"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#9CE8F1" />
              <stop offset="0.51" stopColor="#35D0E2" />
              <stop offset="1" stopColor="#A1EAF2" />
            </linearGradient>

            <linearGradient
              id="paint2_linear_9816_20832"
              x1="-3.12572"
              y1="9.19039"
              x2="21.9601"
              y2="18.0114"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.27" stopColor="#10DAF9" />
              <stop offset="0.36" stopColor="#0FD3F3" />
              <stop offset="0.48" stopColor="#0FC2E5" />
              <stop offset="0.63" stopColor="#0FA5CD" />
              <stop offset="0.79" stopColor="#0E7DAB" />
              <stop offset="0.96" stopColor="#0D4A81" />
              <stop offset="1" stopColor="#0D3C75" />
            </linearGradient>
          </defs>
      </svg>
    </div>
  );
};

export default OrionLogo;
