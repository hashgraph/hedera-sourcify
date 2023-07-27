import { useState } from "react";
import { HiMenu } from "react-icons/hi";
import { Link } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import { ReactComponent as Matrix } from "../../assets/icons/matrix.svg";
import { ReactComponent as Twitter } from "../../assets/icons/twitter.svg";
import logoText from "../../assets/logo-rounded.svg";
import { DOCS_URL, HASHSCAN_URL } from "../../constants";

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
      <div className="flex items-center">
        <Link to="/" className="flex items-center">
          <img src={logoText} alt="Sourcify logo" className="max-h-10" />
          <span className="ml-3 text-gray-700 font-vt323 text-2xl">
            Hedera
          </span>
        </Link>
      </div>
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
            href={HASHSCAN_URL}
          >
            HashScan
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
