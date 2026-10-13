import { Phone } from "lucide-react";
import { teleconference } from "../lib/teleconference";

export function Teleconference() {
  return (
    <p className="teleconference-contact">
      <Phone size={18} aria-hidden="true" />
      <span>
        <span lang="en" data-no-translate>
          Mahiber teleconference
        </span>{" "}
        <span lang="am">የማኅበር ቴሌኮንፈረንስ ስልክ</span>
        <a href={teleconference.href} data-no-translate>
          {teleconference.number}
        </a>
      </span>
    </p>
  );
}
