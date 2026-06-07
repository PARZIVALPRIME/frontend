import { AppUI } from "./AppUI";
import { SceneMobile } from "./soc/SceneMobile";

export default function MobileApp() {
  return <AppUI sceneComponent={SceneMobile} quality="mobile" />;
}
