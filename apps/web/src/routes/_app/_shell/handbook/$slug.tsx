import { createFileRoute, notFound } from "@tanstack/react-router";

import { ArticleView, findArticle } from "@/features/handbook";
import { problemsQuery } from "@/features/problems";

export const Route = createFileRoute("/_app/_shell/handbook/$slug")({
  loader: async ({ context, params }) => {
    const article = findArticle(params.slug);

    if (!article) throw notFound();

    await context.queryClient.ensureQueryData(problemsQuery(null));

    return article;
  },
  component: ArticleRoute,
});

function ArticleRoute() {
  const article = Route.useLoaderData();

  return <ArticleView article={article} />;
}
