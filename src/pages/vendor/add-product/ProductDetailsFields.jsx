import React from "react";
import { FiX } from "react-icons/fi";
import { LuBadgeInfo } from "react-icons/lu";

export default function ProductDetailsFields({
  condition,
  defectDescription,
  description,
  tags,
  tagInput,
  tagSuggestions,
  invalidField,
  onConditionChange,
  onDefectDescriptionChange,
  onDescriptionChange,
  onAddTag,
  onRemoveTag,
  onTagInputChange,
  onTagKeyDown,
}) {
  return (
    <>
      <div data-add-product-field="condition" className="mb-4">
        <label className="mb-1 text-sm font-medium text-black font-satoshi">
          Product Condition
        </label>
        <select
          value={condition}
          onChange={onConditionChange}
          aria-invalid={invalidField === "condition"}
          className={`h-12 w-full appearance-none rounded-lg border-2 bg-white px-4 pr-10 text-left text-black font-satoshi focus:outline-none focus:ring-2 focus:ring-customOrange ${
            invalidField === "condition" ? "border-red-500" : "border-gray-300"
          }`}
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 011.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 011.06-1.06z%22 /></svg>')",
            backgroundPosition: "right 1rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1rem",
          }}
          required
        >
          <option value="">Select Condition</option>
          <option value="brand new">Brand New</option>
          <option value="thrift">Thrift</option>
          <option value="defect">Defect</option>
        </select>

        {condition === "defect" && (
          <div data-add-product-field="defect" className="mt-4">
            <label className="block text-sm font-medium text-black font-satoshi">
              Defect Description
            </label>
            <input
              type="text"
              value={defectDescription}
              onChange={onDefectDescriptionChange}
              aria-invalid={invalidField === "defect"}
              className={`h-10 w-full rounded-lg border-2 bg-white px-4 pr-10 text-left text-black font-satoshi focus:outline-none focus:ring-2 focus:ring-customOrange ${
                invalidField === "defect" ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
          </div>
        )}
      </div>

      <div data-add-product-field="description" className="mb-3">
        <label className="mb-1 text-sm font-medium text-black font-satoshi">
          Product Description
        </label>
        <div className="relative">
          <textarea
            value={description}
            onChange={onDescriptionChange}
            aria-invalid={invalidField === "description"}
            className={`mt-1 block h-24 w-full resize-none rounded-lg border-2 px-4 py-2 text-sm font-satoshi focus:border-customOrange focus:outline-none ${
              invalidField === "description"
                ? "border-red-500"
                : "border-gray-300"
            }`}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500 font-satoshi">
            {description.length}/700
          </div>
        </div>
        <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5 font-satoshi">
          <LuBadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-customOrange" />
          <p className="text-xs leading-5 text-gray-600">
            <strong className="font-semibold text-gray-900">
              Help buyers decide faster.
            </strong>{" "}
            Mention the fit, material, key features and any wear. Clear details
            build trust and reduce avoidable questions or returns.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 text-sm font-medium text-black font-satoshi">
          Tags
        </label>
        <p className="mb-2 text-xs leading-5 text-gray-500 font-satoshi">
          Suggestions adapt to this listing and remember the tags you use most
          on this device.
        </p>
        {tagSuggestions.length > 0 && (
          <div className="relative mb-2 flex max-w-full gap-2 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar">
            {tagSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onAddTag(suggestion)}
                className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-customRichBrown font-satoshi active:bg-orange-100"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center rounded-lg border-2 border-gray-300 p-2">
          {tags.map((tag, index) => (
            <div
              key={`${tag}-${index}`}
              className="mb-2 mr-2 flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-black font-satoshi"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                aria-label={`Remove ${tag}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-gray-500"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={onTagInputChange}
            onKeyDown={onTagKeyDown}
            placeholder="Type a tag, then press comma or return"
            className="min-w-[180px] flex-grow border-none text-sm text-black outline-none font-satoshi"
          />
        </div>
      </div>
    </>
  );
}
