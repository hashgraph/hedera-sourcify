import { useState } from "react";
import { HiMenu } from "react-icons/hi";
import { Link } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import logoText from "../../assets/brand-product-logo-black.png";
import { DOCS_URL } from "../../constants";
import {configuration} from "../../utils/Configuration";

const Header = () => {
  const [showNav, setShowNav] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768); // tailwind md=768px
  window.addEventListener("resize", () => {
    setIsDesktop(window.innerWidth > 768);
  });

  const toggleNav = () => {
    setShowNav((prev) => !prev);
  };
  return (
    <header className="flex justify-between py-4 md:py-6 w-auto flex-wrap md:flex-nowrap">
      <ReactTooltip effect="solid" />
      <Link to="/" className="flex items-center">
        <img src={logoText} alt="HashScan logo" style={{minWidth:220,maxWidth:220}}/>
      </Link>
      <button className="block md:hidden" onClick={toggleNav}>
        <HiMenu className="text-gray-700 text-3xl hover:text-ceruleanBlue-500" />
      </button>
      {/* A div to break flex into new line */}
      <div className="h-0 basis-full"></div>
      <div
        className={`${
          showNav || isDesktop ? "flex" : "hidden"
        } items-center justify-center md:justify-end text-center flex-col md:flex-row w-full mt-4 md:mt-0`}
      >
        <nav
          className={`${
            showNav || isDesktop ? "flex" : "hidden"
          } font-vt323 text-2xl text-gray-700 flex-col md:flex-row`}
        >
          <Link
            className="link-underline mx-2 my-2 md:mx-6 hover:text-ceruleanBlue-500"
            to="/verifier"
          >
            Verify
          </Link>
          <Link
            className="link-underline mx-2 my-2 md:mx-6 hover:text-ceruleanBlue-500"
            to="/lookup"
          >
            Lookup
          </Link>
          <a
            className="link-underline mx-2 my-2 md:mx-6 hover:text-ceruleanBlue-500"
            href={DOCS_URL}
          >
            Docs
          </a>
          <a
            className="link-underline mx-2 my-2 md:mx-6 hover:text-ceruleanBlue-500"
            href={configuration.hashScanUrl}
          >
            HashScan
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
