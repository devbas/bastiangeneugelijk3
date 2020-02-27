---
title: Setting up my personal website on the JAMstack with Ghost, Gatsby, React, Docker, MySQL and Netlify
date: 2020-01-02
draft: false
summary: I'm creating a system to develop a habit of writing. To accommodate for this, I decided to recreate my static website with Ghost, so I could write blog posts in Markdown.
---

I'm creating a system to develop a habit of writing. Part of this system is to make the logistics of the writing process as easy as possible since I'm a lazy human being. To accommodate for this, I decided to recreate my static website with Ghost, so I can write blog posts in Markdown.

I had the following requirements for this setup:

- Since there is server-side logic involved, everything needs to run in Docker to make it easy to move stuff around.
- Generated data/content is mounted as a Docker volume, so no data is lost in case the Docker image is removed.
- Use MySQL instead of the default SQLite for Ghost, to persist the stored records in the database.
- Static hosting for security, scalability and speed.
- Be able to type blog posts in Markdown rather than creating a HTML page. Creating a HTML page distracted me from the writing and added unnecessary overhead every time I wanted to write something.
- Be able to extend blog posts written in Markdown with custom HTML/JS/css. This is especially necessary for the project I am doing, an example can be found [here](https://bastiangeneugelijk.com/public-transport-assistant/).

Ghost has a [sample project](https://github.com/TryGhost/gatsby-starter-ghost) that shows a Ghost + Gatsby implementation. [Gatsby](https://www.gatsbyjs.org) is an open source framework based on React that pulls data from a datastore (Ghost in this case) with GraphQL, blends it into a developed React application and builds a (almost) static website out of it. More on the Ghost and Gatsby integration can be found [here](https://ghost.org/docs/api/v3/gatsby/). Since the sample project is pretty good, I decided to clone it and make it my own.

Once the application was completed, I decided to host it on Netlify, so I wouldn't have to worry about scalability and security. Also, Netlify offers a [very nice implementation](https://www.netlify.com/blog/2016/02/24/a-step-by-step-guide-gatsby-on-netlify/) with Gatsby.

The current website setup is as follows:

![alt text](/images/gatsby-setup.png "Gatsby setup with Netlify")

In retrospect, I've learned the following:  

- The Gatsby dev mode makes debugging React difficult. Since there is an extra layer on top, I had to customise my usual React debugging flow.  
- A truly static website is still way faster. Although I'm now able to create blog posts in Markdown, I had to give in speed due to the loaded Gatsby libraries.

Is this setup overkill for a static website? In the long-term, especially when it comes to maintenance, I think yes. For now, it was interesting to play around with Gatsby; to have a topic to write about and enhance my writing experience.

The whole codebase is available as a [public repo on Github](https://github.com/devbas/bastiangeneugelijk.com).
