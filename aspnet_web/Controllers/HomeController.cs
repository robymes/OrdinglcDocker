using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace WebApplication.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            this.ViewBag["ServiceUrl"] = string.Format("{0}:{1}", Environment.GetEnvironmentVariable("ENV_SERVICEHOST"),
                Environment.GetEnvironmentVariable("ENV_SERVICEPORT"));
            return View();
        }        

        public IActionResult Error()
        {
            return View();
        }
    }
}
