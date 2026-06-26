import streamDeck from "@elgato/streamdeck";
import { SemaphoreLight } from "./actions/semaphore-light.js";
import {
  SemaphoreGreen,
  SemaphoreRed,
  SemaphoreYellow,
} from "./actions/semaphore-fixed-light.js";

streamDeck.actions.registerAction(new SemaphoreLight());
streamDeck.actions.registerAction(new SemaphoreGreen());
streamDeck.actions.registerAction(new SemaphoreYellow());
streamDeck.actions.registerAction(new SemaphoreRed());

streamDeck.connect();
