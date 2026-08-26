import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConversationClassifier } from "./conversation-classifier";

const successfulResult = {
  prediction: "guilt_tripping",
  confidence: 0.784,
  probabilities: {
    charm_flattery: 0.01,
    direct_coercion: 0.05,
    gaslighting: 0.08,
    guilt_tripping: 0.784,
    love_bombing: 0.02,
    neutral: 0.036,
    passive_aggressive: 0.02
  }
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ConversationClassifier", () => {
  it("starts with Person A and Person B, then adds and removes an alternating turn", async () => {
    const user = userEvent.setup();
    render(<ConversationClassifier />);

    expect(screen.getByLabelText("Person A")).toBeInTheDocument();
    expect(screen.getByLabelText("Person B")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Add Turn" }));
    expect(screen.getAllByLabelText("Person A")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remove turn 3" }));
    expect(screen.getAllByPlaceholderText("Type conversation...")).toHaveLength(2);
  });

  it("shows a simple validation message for an empty conversation", async () => {
    const user = userEvent.setup();
    render(<ConversationClassifier />);

    await user.click(screen.getByRole("button", { name: "Analyze Conversation" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter text for every conversation turn."
    );
  });

  it("submits alternating speakers and displays the prediction with seven probabilities", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => successfulResult
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ConversationClassifier />);

    const textareas = screen.getAllByPlaceholderText("Type conversation...");
    await user.type(textareas[0], "Remember when I helped you?");
    await user.type(textareas[1], "Yes.");
    await user.click(screen.getByRole("button", { name: "+ Add Turn" }));
    await user.type(screen.getAllByPlaceholderText("Type conversation...")[2], "Then help me now.");
    await user.click(screen.getByRole("button", { name: "Analyze Conversation" }));

    expect(await screen.findByRole("heading", { name: "Guilt Tripping" })).toBeInTheDocument();
    expect(screen.getAllByText("78.4%")).toHaveLength(2);
    expect(screen.getAllByRole("progressbar")).toHaveLength(7);

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.turns).toEqual([
      { speaker: "A", text: "Remember when I helped you?" },
      { speaker: "B", text: "Yes." },
      { speaker: "A", text: "Then help me now." }
    ]);
  });

  it("shows Analyzing and prevents duplicate submissions while waiting", async () => {
    let finishRequest: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            finishRequest = resolve;
          })
      )
    );
    const user = userEvent.setup();
    render(<ConversationClassifier />);

    const textareas = screen.getAllByPlaceholderText("Type conversation...");
    await user.type(textareas[0], "Hello");
    await user.type(textareas[1], "Hi");
    await user.click(screen.getByRole("button", { name: "Analyze Conversation" }));

    expect(screen.getByRole("button", { name: "Analyzing..." })).toBeDisabled();

    finishRequest?.({ ok: true, json: async () => successfulResult });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Analyze Conversation" })).toBeEnabled()
    );
  });

  it("shows the API model-missing message without exposing technical details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          detail: {
            code: "MODEL_MISSING",
            message: "Model missing. Place LR_C1.joblib inside the web/model folder."
          }
        })
      })
    );
    const user = userEvent.setup();
    render(<ConversationClassifier />);

    const textareas = screen.getAllByPlaceholderText("Type conversation...");
    await user.type(textareas[0], "Hello");
    await user.type(textareas[1], "Hi");
    await user.click(screen.getByRole("button", { name: "Analyze Conversation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Model missing. Place LR_C1.joblib inside the web/model folder."
    );
  });
});
